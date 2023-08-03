import { io, Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { 
    createControlTransport,
    createDevice, createScreenTransport, getControlConsumer, getScreenProducer 
} from './mediasoup';
import { Buffer } from 'buffer';
import { controlEventListener, displayScreen } from './canvas';
import { sendRequest } from './util';
import { AudioData, ControlData } from '../../util/type';

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

    // private preImg = Buffer.alloc(0);   // --- Screen Image Buffer jpeg 
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
            console.log(`producer.readyState: ${producer.readyState}`);
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
        const params: AudioData
             = await sendRequest(socket, 'establishDesktopAudio', desktopId);
        
        // const buf = Buffer.from(data as ArrayBuffer);
        // const msg = JSON.parse(buf.toString());
        const msg = params;
        console.log(msg);

        const ffmpegPid = await window.api.getAudio(this.pulseAudioDevice, msg);
        return ffmpegPid;
    }

}