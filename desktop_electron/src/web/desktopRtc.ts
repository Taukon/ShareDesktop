import { io, Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { Chrome111 } from 'mediasoup-client/lib/handlers/Chrome111.js';

import { Buffer } from 'buffer';
import { AudioData, ControlData } from '../util/type';
import { keyboradX11 } from '../util/keyboardX11';
// @ts-ignore
window.Buffer = Buffer;


export class DesktopRtc {
    public desktopId: string;
    public sock: Socket;

    private displayName: string;
    private interval: number;
    private intervalId?: NodeJS.Timer;

    public localScreen?: {
        canvas: HTMLCanvasElement,
        image: HTMLImageElement
    }

    private preImg = Buffer.alloc(0);   // --- Screen Image Buffer jpeg 
    private ffmpegPid?: number;   // ---ffmpeg process
    // // --- for ffmpeg
    private pulseAudioDevice = 1;
    // // --- end ffmpeg


    private msDevice?: mediasoupClient.types.Device;
    private msControlTransport?: mediasoupClient.types.Transport;
    private msScreenTransport?: mediasoupClient.types.Transport;

    constructor(displayNum: number, desktopId: string, socket: Socket, interval: number, canvas?: HTMLCanvasElement){
        this.displayName = `:${displayNum}`;

        this.desktopId = desktopId;
        this.sock = socket;
        this.interval = interval;

        if(canvas){
            this.localScreen = {canvas: canvas, image: new Image()};
            this.localScreen.canvas.setAttribute('tabindex', String(0));
            this.localScreen.image.onload = () => {
                if(this.localScreen){
                    this.localScreen.canvas.width = this.localScreen.image.width;
                    this.localScreen.canvas.height = this.localScreen.image.height;
                    this.localScreen.canvas.getContext('2d')?.drawImage(this.localScreen.image, 0, 0);
                }
            }
        }

    }

    public async initDesktop(): Promise<void> {
        await this.createDevice();

        this.msControlTransport = await this.createControlTransport();
        this.msScreenTransport = await this.createScreenTransport();

        this.getAudio();
        this.getControl();
        if(this.localScreen){
            this.controlEventListener(this.localScreen.canvas);
        }
        this.sendScreen();
        //this.sendFullScreen();
    }

    public async initDesktopNoAudio(): Promise<void> {
        await this.createDevice();

        this.msControlTransport = await this.createControlTransport();
        this.msScreenTransport = await this.createScreenTransport();

        this.getControl();
        if(this.localScreen){
            this.controlEventListener(this.localScreen.canvas);
        }
        await this.sendScreen();
        //this.sendFullScreen();
    }

    public deleteDesktop(): void {
        if (this.ffmpegPid) {
            window.api.stopAudio(this.ffmpegPid);
        }

        console.log("disconnect clear intervalId: " + this.intervalId);
        clearInterval(this.intervalId);
    }

    private async createDevice(): Promise<void> {
        const rtpCap: mediasoupClient.types.RtpCapabilities = await this.sendRequest('getRtpCapabilities', this.desktopId);
        //console.log(rtpCap);
        const device = new mediasoupClient.Device({handlerFactory: Chrome111.createFactory()});
        await device.load({ routerRtpCapabilities: rtpCap });
        this.msDevice = device;
    }

    // --- Producer ---

    private async createScreenTransport(): Promise<mediasoupClient.types.Transport | undefined> {
        if (this.msDevice) {
            const params = await this.sendRequest('createDesktopScreen', this.desktopId);
            const transport = this.msDevice.createSendTransport(params);

            transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                this.sendRequest('connectDesktopScreen', {
                    desktopId: this.desktopId,
                    dtlsParameters: dtlsParameters,
                }).then(callback)
                    .catch(errback);
            });

            transport.on('producedata', async (parameters, callback, errback) => {
                try {
                    const id = await this.sendRequest('establishDesktopScreen', {
                        desktopId: this.desktopId,
                        produceParameters: parameters,
                    });
                    callback({ id: id });
                } catch (err: any) {
                    errback(err);
                }
            });

            transport.observer.on('close', () => {
                transport.close();
            });

            return transport;
        }
        return undefined;
    }

    // --- Cousumer ---

    private async createControlTransport(): Promise<mediasoupClient.types.Transport | undefined> {
        if (this.msDevice) {
            const params = await this.sendRequest('createDesktopControl', this.desktopId);
            const transport = this.msDevice.createRecvTransport(params);

            transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                this.sendRequest('connectDesktopControl', {
                    desktopId: this.desktopId,
                    dtlsParameters: dtlsParameters
                }).then(callback)
                    .catch(errback);
            });

            transport.observer.on('close', () => {
                transport.close();
            });

            return transport;
        }
        return undefined;
    }

    // ----- screen ----------
    private async sendScreen(): Promise<void> {
        if(this.msScreenTransport){

            const producer = await this.msScreenTransport.produceData({ordered: false, maxRetransmits: 0});

            if(producer.readyState === "open") {
                // console.log(`producer.readyState: ${producer.readyState}`);
                this.intervalId = setInterval(async () => {
                    try {
                        const img = await window.api.getScreenshot(this.displayName);
                        if(img){
                            if (Buffer.compare(img, this.preImg) != 0) {
                                //
                                this.displayScreen(img);
                                //
                                producer.send(img);
                                this.preImg = Buffer.from(img.buffer);
                            }
                        }
                    }catch(err){
                        console.log(err);
                    }
              
                }, this.interval);
            }else{
                console.log(`producer.readyState: ${producer.readyState}`);
                producer.on('open', () => {
                    this.intervalId = setInterval(async () => {
                        try {
                            const img = await window.api.getScreenshot(this.displayName);
                            if(img){
                                if (Buffer.compare(img, this.preImg) != 0) {
                                    //
                                    this.displayScreen(img);
                                    //
                                    producer.send(img);
                                    this.preImg = Buffer.from(img.buffer);
                                }
                            }
                        }catch(err){
                            console.log(err);
                        }
                  
                    }, this.interval);
                });
            }
        }
    }

    public async sendFullScreen(): Promise<void> {
        if(this.msScreenTransport){

            const producer = await this.msScreenTransport.produceData();
          
            if(producer.readyState === "open") {
                // console.log(`producer.readyState: ${producer.readyState}`);
                this.intervalId = setInterval(async () => {
                    try {
                        const img = await window.api.getFullScreenshot(this.displayName);
                        if(img){
                            if (Buffer.compare(img, this.preImg) != 0) {
                                //
                                this.displayScreen(img);
                                //
                                producer.send(img);
                                this.preImg = Buffer.from(img.buffer);
                            }
                        }
                    }catch(err){
                        console.log(err);
                    }
              
                }, this.interval);
            }else{
                console.log(`producer.readyState: ${producer.readyState}`);
                producer.on('open', () => {
                    this.intervalId = setInterval(async () => {
                        try {
                            const img = await window.api.getFullScreenshot(this.displayName);
                            if(img){
                                if (Buffer.compare(img, this.preImg) != 0) {
                                    //
                                    this.displayScreen(img);
                                    //
                                    producer.send(img);
                                    this.preImg = Buffer.from(img.buffer);
                                }
                            }
                        }catch(err){
                            console.log(err);
                        }
                  
                    }, this.interval);
                });
            }
        }
    }

    // ----- keyboard ----------
    private async getControl(): Promise<void> {
        if (this.msControlTransport) {
            const params = await this.sendRequest('establishDesktopControl', this.desktopId);
            const consumer = await this.msControlTransport.consumeData(params);

            consumer.on('message', msg => {
                const buf = Buffer.from(msg as ArrayBuffer);
                const data: ControlData = JSON.parse(buf.toString());
                //console.log(data);

                window.api.testControl(this.displayName, data);
            });
        }
    }

    // ----------- audio -------------
    private async getAudio(): Promise<void> {
        const params: AudioData = await this.sendRequest('establishDesktopAudio', this.desktopId);
        if(params){
            // const buf = Buffer.from(data as ArrayBuffer);
            // const msg = JSON.parse(buf.toString());
            const msg = params;
            console.log(msg);

            this.ffmpegPid = await window.api.getAudio(this.pulseAudioDevice, msg);
        }
    }

    // ---------- common use ----------

    private async sendRequest(type: string, data: any): Promise<any> {
        return new Promise((resolve) => {
            this.sock.emit(type, data, (res: any) => resolve(res));
        });
    }
    
    // ------------ for local canvas ----------------

    private displayScreen(img: Buffer): void {
        if(this.localScreen){
            const imgBase64 = btoa(new Uint8Array(img).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            this.localScreen.image.src = 'data:image/jpeg;base64,' + imgBase64;
        }
    }

    private controlEventListener(canvas: HTMLCanvasElement): void {
        canvas.addEventListener('mousedown', () => {
            const button = { "button": { "buttonMask": 0x1, "down": true } };
            window.api.testControl(this.displayName, button);
            //console.log("mousedown: " + JSON.stringify(event));
        }, false);
        canvas.addEventListener('mouseup', () => {
            const button = { "button": { "buttonMask": 0x1, "down": false } };
            window.api.testControl(this.displayName, button);
            //console.log("mouseup: " + JSON.stringify(event));
        }, false);
        canvas.addEventListener('mousemove', (event) => {
            const mouseX = event.clientX - canvas.getBoundingClientRect().left;
            const mouseY = event.clientY - canvas.getBoundingClientRect().top;;
            const motion = { "move": { "x": Math.round(mouseX), "y": Math.round(mouseY) } };
            window.api.testControl(this.displayName, motion);
            //console.log("mousemove : x=" + mouseX + ", y=" + mouseY);
        }, false);

        canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            const buttonDown = { "button": { "buttonMask": 0x4, "down": true } };
            const buttonUp = { "button": { "buttonMask": 0x4, "down": false } };
            window.api.testControl(this.displayName, buttonDown);
            window.api.testControl(this.displayName, buttonUp);
            //console.log(JSON.stringify(event));
        }, false);

        canvas.addEventListener('keydown', (event) => {
            event.preventDefault();
            const keySim = keyboradX11(event);
            if(keySim){
                const key = { "key": {"keySim": keySim, "down": true}};
                window.api.testControl(this.displayName, key);
            }
            //console.log("keycode down: " + event.key + ' shift:' + event.shiftKey + ' ctrl:' + event.ctrlKey + ' ' + event.keyCode + ' ' + String.fromCharCode(event.keyCode));
        }, false);
        canvas.addEventListener('keyup', (event) => {
            event.preventDefault();
            const keySim = keyboradX11(event);
            if (keySim) {
                const key = { "key": { "keySim": keySim, "down": false } };
                window.api.testControl(this.displayName, key);
            }
            //console.log("keycode up: " + event.key + ' shift:' + event.shiftKey + ' ctrl:' + event.ctrlKey + ' ' + event.keyCode + ' ' + String.fromCharCode(event.keyCode));
        }, false);

        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            if (event.deltaY / 100 > 0){
                const button = { "button": { "buttonMask": 0x10, "down": true } };
                window.api.testControl(this.displayName, button);
            }else {
                const button = { "button": { "buttonMask": 0x8, "down": true } };
                window.api.testControl(this.displayName, button);
            }
            //console.log("scroll: "+JSON.stringify(data.wheel));
        }, false);
    }
     
}
