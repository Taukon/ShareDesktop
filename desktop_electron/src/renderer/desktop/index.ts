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
// import { readFile } from 'fs';

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

            this.startFileWatch(device, socket, desktopId);

            this.onSendFile(device, socket);
            this.onRecvFile(device, socket);
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

    private async startFileWatch(
        device: mediasoupClient.types.Device,
        socket: Socket,
        desktopId: string
    ): Promise<void> {
        const transport = await createFileWatchTransport(device, socket, desktopId);
        const producer = await getFileWatchProducer(transport);

        if(producer.readyState === "open") {
            // console.log(`producer.readyState: ${producer.readyState}`);
            
            setInterval(() => {
                console.log(`start FileWatch1`);
                producer.send(`FILE Watch! desktopID: ${desktopId}`);
            }, 1000);
        }else{
            // console.log(`producer.readyState: ${producer.readyState}`);
            
            producer.on('open', () => {
                setInterval(() => {
                    console.log(`start FileWatch2`);
                    producer.send(`FILE Watch! desktopID: ${desktopId}`);
                }, 1000);
            });
        }
        
    }

    // public onSendFile2(
    //     path: string,
    //     device: mediasoupClient.types.Device,
    //     socket: Socket
    // ) {
    //     socket.on('requestSendFile', async (fileTransferId: string) => {
    //         console.log(`Receive request Send File! ID: ${fileTransferId}`);
    //         // await this.startSendFile(device, socket, fileTransferId);

    //         const transport = await createSendFileTransport(device, socket, fileTransferId);
    //         const producer = await getSendFileProducer(transport);
            
    //         const chunkSize = 16384;
    //         readFile(path, async (err, data) => {
    //             let offset = 0;
    //             const dataLength = data.byteLength;

    //             const status = await WaitFileConsumer(socket, fileTransferId, dataLength);
    //             if(status === fileTransferId){
    //                 if(producer.readyState === "open") {
    //                     while (offset < dataLength) {
    //                         console.log(`send progress: ${offset}`);
    //                         const sliceData = data.slice(offset, offset + chunkSize);
    //                         producer.send(sliceData);
    //                         offset += sliceData.byteLength;
    //                     }   
    //                     socket.emit('endTransferFile', fileTransferId);
    //                 }else{
    //                     producer.on('open', () => {
    //                         while (offset < dataLength) {
    //                             console.log(`send progress: ${offset}`);
    //                             const sliceData = data.slice(offset, offset + chunkSize);
    //                             producer.send(sliceData);
    //                             offset += sliceData.byteLength;
    //                         }
    //                         socket.emit('endTransferFile', fileTransferId);
    //                     });
    //                 }
    //             }
    //         });
    //     });
    // }

    private async onSendFile(
        device: mediasoupClient.types.Device,
        socket: Socket
    ) {
        socket.on('requestSendFile', async (fileTransferId: string) => {
            console.log(`Receive request Send File! ID: ${fileTransferId}`);
            // await this.startSendFile(device, socket, fileTransferId);

            const transport = await createSendFileTransport(device, socket, fileTransferId);
            const producer = await getSendFileProducer(transport);

            const status = await WaitFileConsumer(socket, fileTransferId, `aaa.txt`, 1000);
            console.log(status);
            if(status === fileTransferId){
                if(producer.readyState === "open") {
                    producer.send(`FILE Send! desktopID: ${this.desktopId}`);
                    socket.emit('endTransferFile', fileTransferId);
                }else{
                    //console.log(`producer.readyState: ${producer.readyState}`);
                    
        
                    producer.on('open', () => {
                        producer.send(`FILE Send! desktopID: ${this.desktopId}`);
                        socket.emit('endTransferFile', fileTransferId);
                    });
                }
            }
        });
    }

    // private async startSendFile(
    //     device: mediasoupClient.types.Device,
    //     socket: Socket,
    //     fileTransferId: string
    // ): Promise<void> {
    //     const transport = await createSendFileTransport(device, socket, fileTransferId);
    //     const producer = await getSendFileProducer(transport);

    //     const status = await WaitFileConsumer(socket, fileTransferId);
    //     console.log(status);
    //     if(status === fileTransferId){
    //         if(producer.readyState === "open") {
    //             producer.send(`FILE Send! desktopID: ${this.desktopId}`);
    //             socket.emit('endTransferFile', fileTransferId);
    //         }else{
    //             //console.log(`producer.readyState: ${producer.readyState}`);
    
    //             producer.on('open', () => {
    //                 producer.send(`FILE Send! desktopID: ${this.desktopId}`);
    //                 socket.emit('endTransferFile', fileTransferId);
    //             });
    //         }
    //     }
    // }

    private async onRecvFile(
        device: mediasoupClient.types.Device,
        socket: Socket
    ) {
        socket.on('requestRecvFile', async (fileTransferId: string, fileName: string, fileSize: number) => {
            console.log(`fileName: ${fileName} | fileSize: ${fileSize}`);
            console.log(`Request request Recv File! ID: ${fileTransferId}`);
            // await this.startRecvFile(device, socket, fileTransferId);

            const transport = await createRecvFileTransport(device, socket, fileTransferId);        
            const consumer = await getRecvFileConsumer(transport, socket, fileTransferId);

            if(consumer.readyState === "open"){
                consumer.on('message', msg => {
                    console.log(msg);
                });
                console.log(`readyRecvFile1`);
                setFileConsumer(socket, fileTransferId);
            }else{
                consumer.on('open', () => {
                    consumer.on('message', (msg) => {
                        console.log(msg);
                    });
                    console.log(`readyRecvFile2`);
                    setFileConsumer(socket, fileTransferId);
                });
            }
        });
    }

    // private async startRecvFile(
    //     device: mediasoupClient.types.Device,
    //     socket: Socket,
    //     fileTransferId: string
    // ): Promise<void> {
    //     const transport = await createRecvFileTransport(device, socket, fileTransferId);        
    //     const consumer = await getRecvFileConsumer(transport, socket, fileTransferId);

    //     if(consumer.readyState === "open"){
    //         consumer.on('message', msg => {
    //             console.log(msg);
    //         });
    //         console.log(`readyRecvFile1`);
    //         setFileConsumer(socket, fileTransferId);
    //     }else{
    //         consumer.on('open', () => {
    //             consumer.on('message', (msg) => {
    //                 console.log(msg);
    //             });
    //             console.log(`readyRecvFile2`);
    //             setFileConsumer(socket, fileTransferId);
    //         });
    //     }
    // }

}