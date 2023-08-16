import { Socket } from 'socket.io-client';
import * as mediasoupClient from "mediasoup-client";
import streamSaver from 'streamsaver';
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
import { FileDownload, FileUpload, FileWatchMsg } from './fileTransfer/type';
import { updateFiles } from './fileTransfer';
import { timer } from './util';

export class BrowserWebRTC {
    public desktopId: string;
    // public socket: Socket;

    public canvas: HTMLCanvasElement;
    public image: HTMLImageElement;
    public audio?: HTMLAudioElement;
    public fileUpload?: FileUpload;
    public fileDownload?: FileDownload;

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
        //
        const fileInput = document.createElement("input");
        fileInput.type = 'file';
        // input.name = 'files[]'; // 複数ファイル対応のために[]を追加
        const uploadButton = document.createElement('button');
        uploadButton.textContent = '送信';

        this.fileUpload = {
            input: fileInput,
            button: uploadButton
        };
        this.fileDownload = document.createElement("div");
        //
        //

        this.initDevice(socket, desktopId).then(msDevice => {
            this.startControl(msDevice, socket, this.canvas, desktopId);
            this.startScreen(msDevice, socket, this.image, desktopId);
            if(onAudio){
                this.audio = document.createElement('audio');
                this.audio.play();
                this.startAudio(msDevice, socket, this.audio, desktopId);
            }

            //
            if(this.fileUpload)
            this.initSendFile(this.fileUpload, msDevice, socket, desktopId);
            //
            if(this.fileDownload)
            this.startFileWatch(msDevice, socket, desktopId, this.fileDownload);
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
        desktopId: string,
        fileDownload: FileDownload
    ): Promise<void> {
        const transport = await createFileWatchTransport(device, socket, desktopId);
        const consumer = await getFileWatchConsumer(transport, socket, desktopId);
        
        const recvFileFunc = async (fileName: string) => {
            await this.initRecvFile(device, socket, desktopId, fileName);
        }

        if(consumer.readyState === "open"){
            consumer.on('message', msg => {
                const data: FileWatchMsg = JSON.parse(msg);
                updateFiles(fileDownload, data, recvFileFunc);
            });
            socket.emit('requestFileWatch', desktopId);
        }else{
            consumer.on('open', () => {
                consumer.on('message', msg => {
                    const data: FileWatchMsg = JSON.parse(msg);
                    updateFiles(fileDownload, data, recvFileFunc);
                });
                socket.emit('requestFileWatch', desktopId);
            });
        }
    }

    private async initRecvFile(
        device: mediasoupClient.types.Device,
        socket: Socket,
        desktopId: string,
        fileName: string
    ): Promise<void> {
        const init = initRecvFileTransfer(socket, desktopId, fileName);
        const fileInfo = await init();

        const transport = await createRecvFileTransport(device, socket, fileInfo.fileTransferId);        
        const consumer = await getRecvFileConsumer(transport, socket, fileInfo.fileTransferId);

        if(consumer.readyState === "open"){
            this.receiveFile(
                consumer, 
                socket,
                fileInfo
            );
            setFileConsumer(socket, fileInfo.fileTransferId);
        }else{
            consumer.on('open', () => {
                this.receiveFile(
                    consumer, 
                    socket,
                    fileInfo
                );
                setFileConsumer(socket, fileInfo.fileTransferId);
            });
        }
    }

    private async receiveFile(
        consumer: mediasoupClient.types.DataConsumer,
        socket: Socket,
        fileInfo: FileInfo
    ): Promise<void> {
        let receivedSize = 0;
        
        let stamp = 0;
        let checkStamp = 0;
        let limit = 3;
        let isClosed = false;

        const fileStream = streamSaver.createWriteStream(
            fileInfo.fileName,
            {size: fileInfo.fileSize}
        );

        const writer = fileStream.getWriter();
        if(receivedSize === fileInfo.fileSize){
            writer.close();
            socket.emit('endTransferFile', fileInfo.fileTransferId);
            return;
        }

        consumer.on('message', (msg: ArrayBuffer) => {
            stamp++;
            receivedSize += msg.byteLength;
            writer.write(new Uint8Array(msg));
            if(receivedSize === fileInfo.fileSize){
                isClosed = true;
                writer.close();
                socket.emit('endTransferFile', fileInfo.fileTransferId);
            }
        });

        while(1){
            await timer(2*1000);
            if(isClosed) break;
            if(stamp === checkStamp){
                limit--;
                if(limit == 0){
                    console.log(`cannot recieve file: ${fileInfo.fileName}`);
                    writer.abort();
                    socket.emit('endTransferFile', fileInfo.fileTransferId);
                    break;
                }
            }else{
                checkStamp = stamp;
            }
        }
    }

    private initSendFile(
        fileUpload: FileUpload,
        device: mediasoupClient.types.Device,
        socket: Socket,
        desktopId: string
    ) {
        fileUpload.button.addEventListener('click', () => {
            if(fileUpload.input.files){
                for(let i = 0; i < fileUpload.input.files.length; i++){
                    const fileName = fileUpload.input.files.item(i)?.name;
                    const fileSize = fileUpload.input.files.item(i)?.size;
                    const fileStream = fileUpload.input.files.item(i)?.stream();
                    if(fileName && fileSize && fileStream){
                        console.log(`file name: ${fileName} | size: ${fileSize}`);
                        this.startSendFile(
                            device, 
                            socket, 
                            desktopId,
                            fileName,
                            fileSize,
                            fileStream
                        );
                    }
                }
            }else{
                console.log(`nothing`);
            }
        });
    }

    public async startSendFile(
        device: mediasoupClient.types.Device,
        socket: Socket,
        desktopId: string,
        fileName: string, 
        fileSize: number,
        fileStream: ReadableStream<Uint8Array>
    ): Promise<void> {
        const init = initSendFileTransfer(socket, desktopId);
        const fileTransferId = await init();
        const transport = await createSendFileTransport(device, socket, fileTransferId);

        const producer = await getSendFileProducer(transport);

        const reader = fileStream.getReader();
        // producer.on("close", () => {
        //     reader.releaseLock();
        //     fileStream.cancel();
        // });

        const status = 
            await WaitFileConsumer(
                socket, 
                fileTransferId, 
                fileName,
                fileSize
            );
        if(status === fileTransferId){
            if(producer.readyState === "open") {
                await this.sendFile(producer, reader);
            }else{
                producer.on('open', async () => {
                    await this.sendFile(producer, reader);    
                });
            }
        }
    }

    private async sendFile(
        producer: mediasoupClient.types.DataProducer,
        reader: ReadableStreamDefaultReader<Uint8Array>,
    ): Promise<void> {
        const chunkSize = 65536;
        while(1) {
            const {done, value} = await reader.read();
            if(done) break;
            if(value.byteLength > chunkSize){
                let offset = 0;
                console.log(`Buffer Size Over`);

                while(offset < value.byteLength){
                    const sliceBuf = value.slice(offset, offset + chunkSize);
                    producer.send(sliceBuf);
                    offset += sliceBuf.byteLength;
                    await timer(10);
                }
            }else{
                producer.send(value);
                await timer(10);
            }
        };
        reader.releaseLock();
    }
}
