import { Socket } from 'socket.io-client';
import * as mediasoupClient from "mediasoup-client";
import { controlEventListener } from './canvas';
import { 
    createControlTransport, 
    createDevice, 
    createScreenTransport, 
    getScreenConsumer,
    getControlProducer,
    createAudioTransport,
    getAudioConsumer,
    createRecvFileTransport,
    getRecvFileConsumer,
    createSendFileTransport,
    getSendFileProducer,
    WaitFileConsumer,
    createFileWatchTransport,
    getFileWatchConsumer
} from './browser';
import { initRecvFileTransfer, initSendFileTransfer, setFileConsumer } from './signaling';
import { FileInfo } from './signaling/type';

export class BrowserWebRTC {
    public desktopId: string;
    // public socket: Socket;

    public canvas: HTMLCanvasElement;
    public image: HTMLImageElement;
    public audio?: HTMLAudioElement;

    constructor(desktopId: string, socket: Socket, onAudio: boolean) {
        this.desktopId = desktopId;
        // this.socket = socket;

        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute('tabindex', String(0));

        this.image = new Image();
        this.image.onload = () => {
            this.canvas.width = this.image.width;
            this.canvas.height = this.image.height;
            this.canvas.getContext('2d')?.drawImage(this.image, 0, 0);
        }

        this.initDevice(socket, desktopId).then(msDevice => {
            this.startControl(msDevice, socket, this.canvas, desktopId);
            this.startScreen(msDevice, socket, this.image, desktopId);
            if(onAudio){
                this.audio = document.createElement('audio');
                this.audio.play();
                this.startAudio(msDevice, socket, this.audio, desktopId);
            }

            this.startFileWatch(msDevice, socket, desktopId);

            this.initRecvFile(msDevice, socket, desktopId);
            this.initSendFile(msDevice, socket, desktopId);
        })
    }

    private async initDevice(
        socket: Socket,
        desktopId: string
    ): Promise<mediasoupClient.types.Device> {
        const device = await createDevice(socket, desktopId);

        return device;
    }

    private async startControl(
        device: mediasoupClient.types.Device,
        socket: Socket,
        canvas: HTMLCanvasElement,
        desktopId: string
    ): Promise<void> {
        const transport = await createControlTransport(device, socket, desktopId);
        const producer = await getControlProducer(transport);
        // console.log(`producer.readyState: ${producer.readyState}`);
        if(producer.readyState === "open") {
            controlEventListener(canvas, producer);
        }else {
            producer.on('open', () => {
                controlEventListener(canvas, producer);
            });
        }
    }

    private async startScreen(
        device: mediasoupClient.types.Device,
        socket: Socket,
        image: HTMLImageElement,
        desktopId: string
    ): Promise<void> {
        const transport = await createScreenTransport(device, socket, desktopId);
        const consumer = await getScreenConsumer(transport, socket, desktopId);
        
        if(consumer.readyState === "open"){
            consumer.on('message', buf => {
                const imgBase64 = btoa(new Uint8Array(buf).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                image.src = 'data:image/jpeg;base64,' + imgBase64;
            });
        }else{
            consumer.on('open', () => {
                consumer.on('message', buf => {
                    const imgBase64 = btoa(new Uint8Array(buf).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                    image.src = 'data:image/jpeg;base64,' + imgBase64;
                });
            });
        }
    }

    private async startAudio(
        device: mediasoupClient.types.Device,
        socket: Socket,
        audio: HTMLAudioElement,
        desktopId: string
    ): Promise<void> {
        const transport = await createAudioTransport(device, socket, desktopId);
        const consumer = await getAudioConsumer(device.rtpCapabilities, transport, socket, desktopId);
        //console.log("get audio");
        const { track } = consumer;

        audio.srcObject = new MediaStream([track]);
    }

    private async startFileWatch(
        device: mediasoupClient.types.Device,
        socket: Socket,
        desktopId: string
    ): Promise<void> {
        const transport = await createFileWatchTransport(device, socket, desktopId);
        const consumer = await getFileWatchConsumer(transport, socket, desktopId);
        
        if(consumer.readyState === "open"){
            consumer.on('message', msg => {
                console.log(msg);
            });
        }else{
            consumer.on('open', () => {
                consumer.on('message', msg => {
                    console.log(msg);
                });
            });
        }
    }

    public async initRecvFile(
        device: mediasoupClient.types.Device,
        socket: Socket,
        desktopId: string
    ): Promise<void> {
        const init = initRecvFileTransfer(socket, desktopId);
        const fileInfo = await init();
        await this.startRecvFile(device, socket, fileInfo);
    }

    private async startRecvFile(
        device: mediasoupClient.types.Device,
        socket: Socket,
        fileInfo: FileInfo
    ): Promise<void> {
        const fileTransferId = fileInfo.fileTransferId;
        
        const transport = await createRecvFileTransport(device, socket, fileInfo.fileTransferId);        
        const consumer = await getRecvFileConsumer(transport, socket, fileInfo.fileTransferId);

        if(consumer.readyState === "open"){
            this.receiveFile(
                consumer, 
                fileInfo.fileName, 
                fileInfo.fileSize,
                fileInfo.fileMimeType
            );
            console.log(`readyRecvFile1`);
            setFileConsumer(socket, fileTransferId);
        }else{
            consumer.on('open', () => {
                this.receiveFile(
                    consumer, 
                    fileInfo.fileName, 
                    fileInfo.fileSize,
                    fileInfo.fileMimeType
                );
                console.log(`readyRecvFile2`);
                setFileConsumer(socket, fileTransferId);
            });
        }
    }

    private receiveFile(
        consumer: mediasoupClient.types.DataConsumer,
        fileName: string,
        fileSize: number,
        fileMimeType: string
    ) {
        let receivedSize = 0;
        let receivedBuffer: ArrayBuffer = new ArrayBuffer(0);
        consumer.on('message', (msg: ArrayBuffer) => {
            receivedSize += msg.byteLength;
            receivedBuffer = this.appendBuffer(receivedBuffer, new Uint8Array(msg).buffer);
            
            // console.log(receivedBuffer);

            if(receivedSize == fileSize){
                const blob = new Blob([receivedBuffer], {type: fileMimeType});

                const element = document.createElement("a");
                element.download = fileName;
                element.href = window.URL.createObjectURL(blob);
                element.click();
                console.log(element);
            }
        });
    }

    private appendBuffer(buffer1: ArrayBuffer, buffer2: ArrayBuffer) {
        const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
        tmp.set(new Uint8Array(buffer1), 0);
        tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
        return tmp.buffer;
    };

    public async initSendFile(
        device: mediasoupClient.types.Device,
        socket: Socket,
        desktopId: string
    ): Promise<void> {
        const init = initSendFileTransfer(socket, desktopId);
        const fileTransferId = await init();
        await this.startSendFile(device, socket, fileTransferId);
    }

    private async startSendFile(
        device: mediasoupClient.types.Device,
        socket: Socket,
        fileTransferId: string
    ): Promise<void> {
        const transport = await createSendFileTransport(device, socket, fileTransferId);
        const producer = await getSendFileProducer(transport);

        const status = 
            await WaitFileConsumer(
                socket, 
                fileTransferId, 
                `bbb.txt`, 
                1000,
                `text/plain`
            );
        console.log(status);
        if(status === fileTransferId){
            if(producer.readyState === "open") {
                producer.send(`FILE Send! from Browser: ${this.desktopId}`);
                socket.emit('endTransferFile', fileTransferId);
            }else{
                console.log(`producer.readyState: ${producer.readyState}`);
    
                producer.on('open', () => {
                    producer.send(`FILE Send! from Browser: ${this.desktopId}`);
                    socket.emit('endTransferFile', fileTransferId);
                });
            }
        }        

    }

}