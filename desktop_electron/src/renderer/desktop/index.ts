import { io, Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { 
    createControlTransport,
    createDevice, 
    createFileWatchTransport, 
    createRecvFileTransport, 
    createScreenTransport, 
    createSendFileTransport, 
    getControlConsumer, 
    getFileWatchProducer, 
    getRecvFileConsumer, 
    getScreenProducer, 
    getSendFileProducer, 
    WaitFileConsumer 
} from './desktop';
import { Buffer } from 'buffer';
import { controlEventListener, displayScreen } from './canvas';
import { ControlData } from '../../util/type';
import { establishDesktopAudio, setFileConsumer } from './signaling';
import { FileInfo } from './signaling/type';
import { FileProducers } from './mediasoup/type';
import { publicDecrypt } from 'crypto';
import { timer } from '../util';

// @ts-ignore
window.Buffer = Buffer;

export class DesktopWebRTC {
    public desktopId: string;
    public socket: Socket;

    private displayName: string;
    private intervalId?: NodeJS.Timer;

    public canvas: HTMLCanvasElement;
    public image: HTMLImageElement;
    public audio?: HTMLAudioElement;

    private ffmpegPid?: number;   // ---ffmpeg process
    // // --- for ffmpeg
    private pulseAudioDevice = 1;
    // // --- end ffmpeg

    private fileProducers: FileProducers = {};

    constructor(
        displayNum: number, 
        desktopId: string, 
        socket: Socket, 
        interval: number, 
        onDisplayScreen: boolean,
        isFullScreen: boolean,
        onAudio: boolean
    ){
        this.displayName = `:${displayNum}`;

        this.desktopId = desktopId;
        this.socket = socket;

        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute('tabindex', String(0));
        this.image = new Image();
        this.image.onload = () => {
            this.canvas.width = this.image.width;
            this.canvas.height = this.image.height;
            this.canvas.getContext('2d')?.drawImage(this.image, 0, 0);
        }

        createDevice(socket, desktopId).then(device => {
            this.startScreen(
                device, 
                socket, 
                this.image, 
                desktopId, 
                this.displayName, 
                interval, 
                onDisplayScreen, 
                isFullScreen);

            this.startControl(device, socket, desktopId, this.displayName);
            if(onDisplayScreen){
                controlEventListener(this.canvas, this.displayName);
            }

            if(onAudio){
                this.startAudio(socket, desktopId).then(ffmpegPid => {
                    this.ffmpegPid = ffmpegPid;
                });
            }

            this.startFileShare(device, socket, desktopId);
        });

    }

    public deleteDesktop(): void {
        if (this.ffmpegPid) {
            window.api.stopAudio(this.ffmpegPid);
        }

        console.log("disconnect clear intervalId: " + this.intervalId);
        clearInterval(this.intervalId);
    }

    private async startScreen(
        device: mediasoupClient.types.Device,
        socket: Socket,
        image: HTMLImageElement,
        desktopId: string,
        displayName: string,
        interval: number,
        onDisplayScreen: boolean,
        isFullScreen: boolean
    ): Promise<void> {
        const transport = await createScreenTransport(device, socket, desktopId);
        const producer = await getScreenProducer(transport);

        if(producer.readyState === "open") {
            // console.log(`producer.readyState: ${producer.readyState}`);
            this.intervalId = this.loopGetScreen(
                                    producer,
                                    image,
                                    displayName,
                                    interval,
                                    onDisplayScreen,
                                    isFullScreen
                                );
        }else{
            //console.log(`producer.readyState: ${producer.readyState}`);
            producer.on('open', () => {
                this.intervalId = this.loopGetScreen(
                    producer,
                    image,
                    displayName,
                    interval,
                    onDisplayScreen,
                    isFullScreen
                );
            });
        }
        
    }

    private loopGetScreen(
        producer: mediasoupClient.types.DataProducer,
        image: HTMLImageElement,
        displayName: string,
        interval: number,
        onDisplayScreen: boolean,
        isFullScreen: boolean
    ): NodeJS.Timer|undefined {
        let preImg = Buffer.alloc(0);

        if(!isFullScreen){
            return setInterval(async () => {
                try {
                    const img = await window.api.getScreenshot(displayName);
                    if(img){
                        if (Buffer.compare(img, preImg) != 0) {
                            if(onDisplayScreen){
                                displayScreen(image, img);
                            }
                            producer.send(img);
                            preImg = Buffer.from(img.buffer);
                        }
                    }
                }catch(err){
                    console.log(err);
                }
          
            }, interval);
        }else{
            return setInterval(async () => {
                try {
                    const img = await window.api.getFullScreenshot(displayName);
                    if(img){
                        if (Buffer.compare(img, preImg) != 0) {
                            if(onDisplayScreen){
                                displayScreen(image, img);
                            }
                            producer.send(img);
                            preImg = Buffer.from(img.buffer);
                        }
                    }
                }catch(err){
                    console.log(err);
                }
          
            }, interval);
        }
    }

    private async startControl(
        device: mediasoupClient.types.Device,
        socket: Socket,
        desktopId: string,
        displayName: string
    ): Promise<void> {
        const transport = await createControlTransport(device, socket, desktopId);
        const consumer = await getControlConsumer(transport, socket, desktopId);

        consumer.on('message', msg => {
            const buf = Buffer.from(msg as ArrayBuffer);
            const data: ControlData = JSON.parse(buf.toString());
            //console.log(data);

            window.api.testControl(displayName, data);
        });
    }

    private async startAudio(
        socket: Socket,
        desktopId: string
    ): Promise<number|undefined> {
        const params = await establishDesktopAudio(socket, desktopId);
        
        // const buf = Buffer.from(data as ArrayBuffer);
        // const msg = JSON.parse(buf.toString());
        const msg = params;
        console.log(msg);

        const ffmpegPid = await window.api.getAudio(this.pulseAudioDevice, msg);
        return ffmpegPid;
    }

    private startFileShare(
        device: mediasoupClient.types.Device,
        socket: Socket,
        desktopId: string
    ): void {
        this.startFileWatch(device, socket, desktopId, `test`);

        this.onSendFile(device, socket);
        this.onRecvFile(device, socket);
    }

    private async startFileWatch(
        device: mediasoupClient.types.Device,
        socket: Socket,
        desktopId: string,
        dir: string
    ): Promise<void> {
        const transport = await createFileWatchTransport(device, socket, desktopId);
        const producer = await getFileWatchProducer(transport);

        if(producer.readyState === "open") {
            window.api.streamFileWatchMsg((data) => {
                producer.send(JSON.stringify(data));
            });
            await window.api.initFileWatch(dir);
        }else{
            producer.on('open', async () => {
                window.api.streamFileWatchMsg((data) => {
                    producer.send(JSON.stringify(data));
                });
                await window.api.initFileWatch(dir);
            });
        }

        socket.on('requestFileWatch', async () => {
            await window.api.sendFileWatch(dir);
        });
    }

    private async onSendFile(
        device: mediasoupClient.types.Device,
        socket: Socket
    ) {
        window.api.streamSendFileBuffer((data) => {
            const producer = this.fileProducers[data.fileTransferId];
            if(producer){
                producer.send(data.buf);
            }
        });

        socket.on('requestSendFile', async (fileTransferId: string, fileName: string) => {
            console.log(`Receive request Send File! ID: ${fileTransferId}`);

            const transport = await createSendFileTransport(device, socket, fileTransferId);
            const producer = await getSendFileProducer(transport);
            
            this.fileProducers[fileTransferId] = producer;
            const fileInfo = await window.api.getFileInfo(fileName);
            if(fileInfo){
                await WaitFileConsumer(
                    socket, 
                    fileTransferId, 
                    fileInfo.fileName, 
                    fileInfo.fileSize
                );

                producer.on('close', () => {
                    transport.close();
                    delete this.fileProducers[fileTransferId];
                });
                
                if(producer.readyState === "open") {
                    await window.api.sendFileBuffer(fileInfo.fileName, fileTransferId);
                    // socket.emit('endTransferFile', fileTransferId);
                }else{
                    producer.on('open', async () => {
                        await window.api.sendFileBuffer(fileInfo.fileName, fileTransferId);
                        // socket.emit('endTransferFile', fileTransferId);
                    });
                }
            }
        });
    }


    private async onRecvFile(
        device: mediasoupClient.types.Device,
        socket: Socket
    ) {
        socket.on('requestRecvFile', async (fileInfo: FileInfo) => {
            const transport = await createRecvFileTransport(device, socket, fileInfo.fileTransferId);        
            const consumer = await getRecvFileConsumer(transport, socket, fileInfo.fileTransferId);

            const isSet = await window.api.setFileInfo(fileInfo.fileName, fileInfo.fileSize);
            console.log(`isSet: ${isSet}`);
            if(!isSet){
                socket.emit('endTransferFile', fileInfo.fileTransferId);
                return;
            }

            if(consumer.readyState === "open"){
                this.receiveFile(consumer, socket, fileInfo);
                setFileConsumer(socket, fileInfo.fileTransferId);
            }else{
                consumer.on('open', () => {
                    this.receiveFile(consumer, socket, fileInfo);
                    setFileConsumer(socket, fileInfo.fileTransferId);
                });
            }
        });
    }

    public async receiveFile(
        consumer: mediasoupClient.types.DataConsumer,
        socket: Socket,
        fileInfo: FileInfo
    ){
        let stamp = 0;
        let checkStamp = 0;
        let limit = 3;
        let isClosed = false;

        consumer.on('message', async (msg: ArrayBuffer) => {
            stamp++;
            const buf = new Uint8Array(msg);
            const receivedSize = await window.api.recvFileBuffer(fileInfo.fileName, buf);
            if(receivedSize === fileInfo.fileSize){
                isClosed = true;
                socket.emit('endTransferFile', fileInfo.fileTransferId);
            }
        });
        
        while(1){
            await timer(2*1000);
            if(isClosed) break;
            if(stamp === checkStamp){
                limit--;
                if(limit == 0){
                    window.api.destroyRecvFileBuffer(fileInfo.fileName);
                    socket.emit('endTransferFile', fileInfo.fileTransferId);
                    break;
                }
            }else{
                checkStamp = stamp;
            }
        }
    }
}