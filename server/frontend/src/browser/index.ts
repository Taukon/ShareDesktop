import { Socket } from 'socket.io-client';
import * as mediasoupClient from "mediasoup-client";
import { 
    createDevice, 
    createRecvTransport, 
    createSendTransport, 
    getAudioConsumer, 
    getControlProducer, 
    getScreenConsumer, 
    recvAudioEventEmitter, 
    recvScreenEventEmitter, 
    sendEventEmitter 
} from './mediasoup';
import { controlEventListener } from './canvas';

export class BrowserWebRTC {
    public desktopId: string;
    // public socket: Socket;

    public canvas: HTMLCanvasElement;
    public image: HTMLImageElement;
    public audio?: HTMLAudioElement;

    // private msDevice?: mediasoupClient.types.Device;
    // private msSendTransport?: mediasoupClient.types.Transport;
    // private msRecvScreenTransport?: mediasoupClient.types.Transport;
    // private msRecvAudioTransport?: mediasoupClient.types.Transport;

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
        })
    }

    private async initDevice(
        socket: Socket,
        desktopId: string
    ): Promise<mediasoupClient.types.Device> {
        const device = await createDevice(socket, desktopId);
        // this.msDevice = device;
        return device;
    }

    private async startControl(
        device: mediasoupClient.types.Device,
        socket: Socket,
        canvas: HTMLCanvasElement,
        desktopId: string
    ): Promise<void> {
        const transport = await createSendTransport(device, socket, desktopId);
        sendEventEmitter(transport, socket, desktopId);

        const producer = await getControlProducer(transport);
        // console.log(`producer.readyState: ${producer.readyState}`);
        if(producer.readyState === "open") {
            controlEventListener(canvas, producer);
        }else {
            producer.on('open', () => {
                controlEventListener(canvas, producer);
            });
        }

        // this.msSendTransport = transport;
    }

    private async startScreen(
        device: mediasoupClient.types.Device,
        socket: Socket,
        image: HTMLImageElement,
        desktopId: string
    ): Promise<void> {
        const transport = await createRecvTransport(device, socket, desktopId, false);
        recvScreenEventEmitter(transport, socket, desktopId);

        const consumer = await getScreenConsumer(transport, socket, desktopId);

        consumer.on('message', buf => {
            const imgBase64 = btoa(new Uint8Array(buf).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            image.src = 'data:image/jpeg;base64,' + imgBase64;
        });

        // this.msRecvScreenTransport = transport;
    }

    private async startAudio(
        device: mediasoupClient.types.Device,
        socket: Socket,
        audio: HTMLAudioElement,
        desktopId: string
    ): Promise<void> {
        const transport = await createRecvTransport(device, socket, desktopId, true);
        recvAudioEventEmitter(transport, socket, desktopId);

        const consumer = await getAudioConsumer(device, transport, socket, desktopId);
        //console.log("get audio");
        const { track } = consumer;

        audio.srcObject = new MediaStream([track]);

        // this.msRecvAudioTransport = transport;
    }


}