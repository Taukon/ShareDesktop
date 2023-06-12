import { Socket } from 'socket.io-client';
import * as mediasoupClient from "mediasoup-client";
import { MousePos, KeyJson, ButtonJson, MotionJson } from './type';
import { KeySims } from './keySim';

export class ClientRtc {

    public desktopId: string;
    public sock: Socket;

    public canvas: HTMLCanvasElement;
    public image: HTMLImageElement;
    public audio?: HTMLAudioElement;

    private msDevice?: mediasoupClient.types.Device;
    private msSendTransport?: mediasoupClient.types.Transport;
    private msRecvScreenTransport?: mediasoupClient.types.Transport;
    private msRecvAudioTransport?: mediasoupClient.types.Transport;


    constructor(desktopId: string, socket: Socket, onAudio: boolean) {
        this.desktopId = desktopId;
        this.sock = socket;

        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute('tabindex', String(0));

        this.image = new Image();
        this.image.onload = () => {
            this.canvas.width = this.image.width;
            this.canvas.height = this.image.height;
            this.canvas.getContext('2d')?.drawImage(this.image, 0, 0);
        }

        if (onAudio) {
            this.audio = document.createElement('audio');
            this.audio.play();
        }
    }

    public async join(this: ClientRtc): Promise<void> {
        await this.createDevice();

        this.msRecvScreenTransport = await this.createRecvScreenTransport();
        this.msRecvAudioTransport = await this.createRecvAudioTransport();
        this.msSendTransport = await this.createSendTransport();

        this.controlEvent();

        this.getAudio();
        await this.getScreen();
    }

    public async joinNoAudio(this: ClientRtc): Promise<void> {
        await this.createDevice();

        this.msRecvScreenTransport = await this.createRecvScreenTransport();
        this.msSendTransport = await this.createSendTransport();

        this.controlEvent();

        await this.getScreen();
    }

    private async createDevice(): Promise<void> {
        const rtpCap: mediasoupClient.types.RtpCapabilities = await this.sendRequest('getRtpCapabilities', this.desktopId);
        //console.log(rtpCap);
        const device = new mediasoupClient.Device();
        await device.load({ routerRtpCapabilities: rtpCap });
        this.msDevice = device;
    }

    // --- Producer ---

    private async createSendTransport(): Promise<mediasoupClient.types.Transport | undefined> {
        if (this.msDevice) {
            const params = await this.sendRequest('createMediaControl', this.desktopId);
            const transport = this.msDevice.createSendTransport(params);

            transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                this.sendRequest('connectMediaControl', {
                    desktopId: this.desktopId,
                    dtlsParameters: dtlsParameters,
                }).then(callback)
                    .catch(errback);
            });

            transport.on('producedata', async (parameters, callback, errback) => {
                try {
                    const id = await this.sendRequest('establishMediaControl', {
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

    private async controlEvent(): Promise<void> {
        if (this.msSendTransport) {
            const producer = await this.msSendTransport.produceData();

            // console.log(`producer.readyState: ${producer.readyState}`);
            if(producer.readyState === "open") {
                this.controlEventListener(producer);
            }else {
                producer.on('open', () => {
                    this.controlEventListener(producer);
                });
            }
        }
    }


    // --- Cousumer ---

    private async createRecvScreenTransport(): Promise<mediasoupClient.types.Transport | undefined> {
        if (this.msDevice) {
            const params = await this.sendRequest('createMediaScreenOrAudio', {
                    desktopId: this.desktopId,
                    isAudio: false
                });
            const transport = this.msDevice.createRecvTransport(params);

            transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                this.sendRequest('connectMediaScreenOrAudio', {
                    desktopId: this.desktopId,
                    dtlsParameters: dtlsParameters,
                    isAudio: false
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


    private async getScreen(): Promise<void> {
        if (this.msRecvScreenTransport) {
        const params = await this.sendRequest('establishMediaScreen', this.desktopId);
            const consumer = await this.msRecvScreenTransport.consumeData(params);

            consumer.on('message', buf => {
                const imgBase64 = btoa(new Uint8Array(buf).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                this.image.src = 'data:image/jpeg;base64,' + imgBase64;
            });
        }
    }


    //-- audio
    private async createRecvAudioTransport(): Promise<mediasoupClient.types.Transport | undefined> {
        if (this.msDevice) {
            const params = await this.sendRequest('createMediaScreenOrAudio', {
                    desktopId: this.desktopId,
                    isAudio: true
                });
            const transport = this.msDevice.createRecvTransport(params);

            transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                this.sendRequest('connectMediaScreenOrAudio', {
                    desktopId: this.desktopId,
                    dtlsParameters: dtlsParameters,
                    isAudio: true
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


    private async getAudio(): Promise<void> {
        if (this.msDevice && this.msRecvAudioTransport && this.audio) {
            const params = await this.sendRequest('establishMediaAudio', {
                desktopId: this.desktopId,
                rtpCapabilities: this.msDevice.rtpCapabilities
            });
            const consumer = await this.msRecvAudioTransport.consume(params);

            //console.log("get audio");
            const { track } = consumer;

            this.audio.srcObject = new MediaStream([track]);
        }
    }


// ---------- utils ----------
    private getPos(event: MouseEvent): MousePos {
        const mouseX = event.clientX - this.canvas.getBoundingClientRect().left;
        const mouseY = event.clientY - this.canvas.getBoundingClientRect().top;
        return { x: mouseX, y: mouseY };
    };

    private keyborad2(msg: KeyboardEvent): number | undefined {

        if (msg.key.length == 1 && msg.key.match(/[a-z]/i)) {
            return msg.key.charCodeAt(0);
            //console.log("key: "+ msg.key.toUpperCase());
        }
        else if (msg.key.length == 1 && msg.key.match(/[0-9]/)) { //0~9
            const num = msg.key.match(/[0-9]/);
            const code = num ? num[0] ? num[0].charCodeAt(0) : undefined : undefined;
            return code;
            //console.log("Num: " + JSON.stringify(msg.key));
        } 
        else if (msg.key.match(/^F[1-9]*/)) { //F1~9
            const keys = msg.key.match(/^F[1-9]*/);
            const keySim = keys? KeySims[`${keys[0]}${keys[1]}`] : undefined;
            return keySim;
            //console.log("F: "+JSON.stringify(msg.key));
        } else if (msg.key == 'Control') {
            return KeySims["Control_L"];
        } else if (msg.key == 'Alt') {
            return KeySims["Alt_L"];
        } else if (msg.key == 'Shift') {
            return KeySims["Shift_L"];
        } else if (msg.key == 'Escape') {
            return KeySims["Escape"];
        } else if (msg.key == 'Enter') {
            return KeySims["Return"];
        } else if (msg.key == 'Backspace') {
            return KeySims["BackSpace"];
        } else if (msg.key == 'Tab') {
            return KeySims["Tab"];
        } else if (msg.key == 'Home') {
            return KeySims["Home"];
        } else if (msg.key == 'End') {
            return KeySims["End"];
        } else if (msg.key == 'PageUp') {
            return KeySims["Page_Up"];
        } else if (msg.key == 'PageDown') {
            return KeySims["Page_Down"];
        } else if (msg.key == 'ArrowRight') {
            return KeySims["Right"];
        } else if (msg.key == 'ArrowLeft') {
            return KeySims["Left"];
        } else if (msg.key == 'ArrowUp') {
            return KeySims["Up"];
        } else if (msg.key == 'ArrowDown') {
            return KeySims["Down"];
        } else if (msg.key == 'Insert') {
            return KeySims["Insert"];
        } else if (msg.key == 'Delete') {
            return KeySims["Delete"];
        } else if (msg.key == ' ') {
            return msg.key.charCodeAt(0);
        } else if (msg.key == 'Alphanumeric') {
            return KeySims["Caps_Lock"];
        } else if (msg.key == '[' || msg.keyCode == 219) {
            return msg.key.charCodeAt(0);
        } else if (msg.key == ']' || msg.keyCode == 221) {
            return msg.key.charCodeAt(0);
        } else if (msg.key == '-') {
            return msg.key.charCodeAt(0);
        } else if (msg.key == ',' || msg.keyCode == 188) {
            return msg.key.charCodeAt(0);
        } else if (msg.key == '.' || msg.keyCode == 190) {
            return msg.key.charCodeAt(0);
        }
        //
        else if (msg.key == '/' || msg.keyCode == 191) {
            return msg.key.charCodeAt(0);
        } else if (msg.key == '\\' || msg.keyCode == 220) {
            return msg.key.charCodeAt(0);
        } else if (msg.key == '+') {
            return msg.key.charCodeAt(0);
        } else if (msg.key == '_') {
            return msg.key.charCodeAt(0);
        } else if (msg.key == '=') {
            return msg.key.charCodeAt(0);
        } else if (msg.key == ':') {
            return msg.key.charCodeAt(0);
        } else if (msg.key == '\"') {
            return msg.key.charCodeAt(0);
        } else if (msg.key == '`') {
            return msg.key.charCodeAt(0);
        } else if (msg.key == '~') {
            return msg.key.charCodeAt(0);
        }
        // --- Shift + 0~9 
        else if (msg.key == '!') {
            return msg.key.charCodeAt(0);
        } else if (msg.key == '@') {
            return msg.key.charCodeAt(0);
        } else if (msg.key == '#') {
            return msg.key.charCodeAt(0);
        } else if (msg.key == '$') {
            return msg.key.charCodeAt(0);
        } else if (msg.key == '%') {
            return msg.key.charCodeAt(0);
        } else if (msg.key == '^') {
            return msg.key.charCodeAt(0);
        } else if (msg.key == '&') {
            return msg.key.charCodeAt(0);
        } else if (msg.key == '*') {
            return msg.key.charCodeAt(0);
        } else if (msg.key == '(') {
            return msg.key.charCodeAt(0);
        } else if (msg.key == ')') {
            return msg.key.charCodeAt(0);
        } else if (msg.key.length == 1) {
            const keySim = msg.key.charCodeAt(0);
            return !Number.isNaN(keySim) ? keySim : undefined;
        }

        //console.log(JSON.stringify(keydata));
        return undefined;
    }

    private controlEventListener(producer: mediasoupClient.types.DataProducer<mediasoupClient.types.AppData>): void {
        this.canvas.addEventListener('mousedown', () => {
            const button: ButtonJson = { "button": { "buttonMask": 0x1, "down": true } };
            producer.send(JSON.stringify(button));
            //console.log("mousedown: " + JSON.stringify(event));
        }, false);
        this.canvas.addEventListener('mouseup', () => {
            const button: ButtonJson = { "button": { "buttonMask": 0x1, "down": false } };
            producer.send(JSON.stringify(button));
            //console.log("mouseup: " + JSON.stringify(event));
        }, false);
        this.canvas.addEventListener('mousemove', (event) => {
            const pos = this.getPos(event);
            const motion: MotionJson = { "move": { "x": Math.round(pos.x), "y": Math.round(pos.y) } };
            producer.send(JSON.stringify(motion));
            //console.log("mousemove : x=" + pos.x + ", y=" + pos.y);
        }, false);

        this.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            const buttonDown: ButtonJson = { "button": { "buttonMask": 0x4, "down": true } };
            const buttonUp: ButtonJson = { "button": { "buttonMask": 0x4, "down": false } };
            producer.send(JSON.stringify(buttonDown));
            producer.send(JSON.stringify(buttonUp));
            //console.log(JSON.stringify(event));
        }, false);

        this.canvas.addEventListener('keydown', (event) => {
            event.preventDefault();
            const keySim = this.keyborad2(event);
            if(keySim){
                const key: KeyJson = { "key": {"keySim": keySim, "down": true}};
                producer.send(JSON.stringify(key));
            }
            //console.log("keycode down: " + event.key + ' shift:' + event.shiftKey + ' ctrl:' + event.ctrlKey + ' ' + event.keyCode + ' ' + String.fromCharCode(event.keyCode));
        }, false);
        this.canvas.addEventListener('keyup', (event) => {
            event.preventDefault();
            const keySim = this.keyborad2(event);
            if (keySim) {
                const key: KeyJson = { "key": { "keySim": keySim, "down": false } };
                producer.send(JSON.stringify(key));
            }
            //console.log("keycode up: " + event.key + ' shift:' + event.shiftKey + ' ctrl:' + event.ctrlKey + ' ' + event.keyCode + ' ' + String.fromCharCode(event.keyCode));
        }, false);

        this.canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            if (event.deltaY / 100 > 0){
                const button: ButtonJson = { "button": { "buttonMask": 0x10, "down": true } };
                producer.send(JSON.stringify(button));
            }else {
                const button: ButtonJson = { "button": { "buttonMask": 0x8, "down": true } };
                producer.send(JSON.stringify(button));
            }
            //console.log("scroll: "+JSON.stringify(data.wheel));
        }, false);
    }

// ---------- common use ----------

    private async sendRequest(type: string, data: any): Promise<any> {
        return new Promise((resolve) => {
            this.sock.emit(type, data, (res: any) => resolve(res));
        });
    }
}
