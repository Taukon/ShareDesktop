import { Socket } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import streamSaver from "streamsaver";
import { controlEventListener } from "./canvas";
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
  getFileWatchConsumer,
} from "./browser";
import {
  initRecvFileTransfer,
  initSendFileTransfer,
  setFileConsumer,
} from "./signaling";
import { FileInfo } from "./signaling/type";
import { FileDownload, FileUpload, FileWatchMsg } from "./fileShare/type";
import { removeFileList, updateFiles } from "./fileShare";
import {
  appHeader,
  appMax,
  appMaxId,
  appStatus,
  createAppProtocol,
  getRandomInt,
  parseAppProtocol,
  timer,
} from "./util";

export class BrowserWebRTC {
  public desktopId: string;

  public canvas: HTMLCanvasElement;
  public image: HTMLImageElement;
  public audio?: HTMLAudioElement;
  public fileUpload?: FileUpload;
  public fileDownload?: FileDownload;
  private device?: mediasoupClient.types.Device;
  private socket?: Socket;

  constructor(desktopId: string, socket: Socket, onAudio: boolean) {
    this.desktopId = desktopId;

    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("tabindex", String(0));

    this.image = new Image();
    this.image.onload = () => {
      this.canvas.width = this.image.width;
      this.canvas.height = this.image.height;
      this.canvas.getContext("2d")?.drawImage(this.image, 0, 0);
    };
    //

    this.initDevice(socket, desktopId).then(async (msDevice) => {
      const isStart = await this.startScreen(
        msDevice,
        socket,
        this.image,
        desktopId,
      );
      if (isStart) {
        this.startControl(msDevice, socket, this.canvas, desktopId);
      }
      if (onAudio) {
        this.audio = document.createElement("audio");
        this.audio.play();
        this.startAudio(msDevice, socket, this.audio, desktopId);
      }

      this.device = msDevice;
      this.socket = socket;
    });
  }

  private async initDevice(
    socket: Socket,
    desktopId: string,
  ): Promise<mediasoupClient.types.Device> {
    const device = await createDevice(socket, desktopId);

    return device;
  }

  private async startControl(
    device: mediasoupClient.types.Device,
    socket: Socket,
    canvas: HTMLCanvasElement,
    desktopId: string,
  ): Promise<void> {
    const transport = await createControlTransport(device, socket, desktopId);
    const producer = await getControlProducer(transport);

    if (producer.readyState === "open") {
      controlEventListener(canvas, producer);
    } else {
      producer.on("open", () => {
        controlEventListener(canvas, producer);
      });
    }
  }

  private async startScreen(
    device: mediasoupClient.types.Device,
    socket: Socket,
    image: HTMLImageElement,
    desktopId: string,
  ): Promise<boolean> {
    const transport = await createScreenTransport(device, socket, desktopId);
    const consumer = await getScreenConsumer(transport, socket, desktopId);

    if (consumer?.readyState === "open") {
      consumer.on("message", (buf) => {
        const parse = parseAppProtocol(new Uint8Array(buf));
        const imgBase64 = btoa(
          new Uint8Array(parse.data).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            "",
          ),
        );
        // const imgBase64 = btoa(
        //   new Uint8Array(buf).reduce(
        //     (data, byte) => data + String.fromCharCode(byte),
        //     "",
        //   ),
        // );
        image.src = "data:image/jpeg;base64," + imgBase64;
      });

      return true;
    } else if (consumer) {
      consumer.on("open", () => {
        consumer.on("message", (buf) => {
          const parse = parseAppProtocol(new Uint8Array(buf));
          const imgBase64 = btoa(
            new Uint8Array(parse.data).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              "",
            ),
          );
          // const imgBase64 = btoa(
          //   new Uint8Array(buf).reduce(
          //     (data, byte) => data + String.fromCharCode(byte),
          //     "",
          //   ),
          // );
          image.src = "data:image/jpeg;base64," + imgBase64;
        });
      });

      return true;
    }
    transport.close();
    return false;
  }

  private async startAudio(
    device: mediasoupClient.types.Device,
    socket: Socket,
    audio: HTMLAudioElement,
    desktopId: string,
  ): Promise<boolean> {
    const transport = await createAudioTransport(device, socket, desktopId);
    const consumer = await getAudioConsumer(
      device.rtpCapabilities,
      transport,
      socket,
      desktopId,
    );
    if (consumer) {
      //console.log("get audio");
      const { track } = consumer;

      audio.srcObject = new MediaStream([track]);
      return true;
    } else {
      transport.close();
      return false;
    }
  }

  public async startFileShare(): Promise<boolean> {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    // input.name = 'files[]'; // 複数ファイル対応のために[]を追加
    const uploadButton = document.createElement("button");
    uploadButton.textContent = "send";

    this.fileUpload = {
      input: fileInput,
      button: uploadButton,
    };
    this.fileDownload = document.createElement("div");

    if (this.device && this.socket) {
      const result = await this.startFileWatch(
        this.device,
        this.socket,
        this.desktopId,
        this.fileDownload,
      );
      if (result) {
        this.initSendFile(
          this.fileUpload,
          this.device,
          this.socket,
          this.desktopId,
        );
        return true;
      }
    }
    return false;
  }

  private async startFileWatch(
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string,
    fileDownload: FileDownload,
  ): Promise<boolean> {
    const transport = await createFileWatchTransport(device, socket, desktopId);
    const consumer = await getFileWatchConsumer(transport, socket, desktopId);

    const recvFileFunc = async (fileName: string) => {
      await this.initRecvFile(device, socket, desktopId, fileName);
    };

    if (consumer?.readyState === "open") {
      consumer.on("close", () => {
        removeFileList(fileDownload);
        transport.close();
      });

      consumer.on("message", (msg) => {
        const data: FileWatchMsg = JSON.parse(msg);
        updateFiles(fileDownload, data, recvFileFunc);
      });
      socket.emit("requestFileWatch", desktopId);

      return true;
    } else if (consumer) {
      consumer.on("close", () => {
        removeFileList(fileDownload);
        transport.close();
      });

      consumer.on("open", () => {
        consumer.on("message", (msg) => {
          const data: FileWatchMsg = JSON.parse(msg);
          updateFiles(fileDownload, data, recvFileFunc);
        });
        socket.emit("requestFileWatch", desktopId);
      });

      return true;
    }

    transport.close();
    return false;
  }

  private async initRecvFile(
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string,
    fileName: string,
  ): Promise<void> {
    const init = initRecvFileTransfer(socket, desktopId, fileName);
    const fileInfo = await init();

    const transport = await createRecvFileTransport(
      device,
      socket,
      fileInfo.fileTransferId,
    );
    const consumer = await getRecvFileConsumer(
      transport,
      socket,
      fileInfo.fileTransferId,
    );

    if (consumer?.readyState === "open") {
      this.receiveFile(consumer, socket, fileInfo);
      setFileConsumer(socket, fileInfo.fileTransferId);
    } else if (consumer) {
      consumer.on("open", () => {
        this.receiveFile(consumer, socket, fileInfo);
        setFileConsumer(socket, fileInfo.fileTransferId);
      });
    }
  }

  private async receiveFile(
    consumer: mediasoupClient.types.DataConsumer,
    socket: Socket,
    fileInfo: FileInfo,
  ): Promise<void> {
    let receivedSize = 0;

    let stamp = 0;
    let checkStamp = 0;
    let limit = 3;
    let isClosed = false;

    const fileStream = streamSaver.createWriteStream(fileInfo.fileName, {
      size: fileInfo.fileSize,
    });

    const writer = fileStream.getWriter();
    if (receivedSize === fileInfo.fileSize) {
      writer.close();
      socket.emit("endTransferFile", fileInfo.fileTransferId);
      return;
    }

    consumer.on("message", (msg: ArrayBuffer) => {
      stamp++;
      const parse = parseAppProtocol(new Uint8Array(msg));
      receivedSize += parse.data.byteLength;
      writer.write(parse.data);
      console.log(`order: ${parse.order} | status: ${parse.status}`);

      if (receivedSize === fileInfo.fileSize) {
        isClosed = true;
        writer.close();
        socket.emit("endTransferFile", fileInfo.fileTransferId);
      }
    });

    // eslint-disable-next-line no-constant-condition
    while (1) {
      await timer(2 * 1000);
      if (isClosed) break;
      if (stamp === checkStamp) {
        limit--;
        if (limit == 0) {
          console.log(`cannot recieve file: ${fileInfo.fileName}`);
          writer.abort();
          socket.emit("endTransferFile", fileInfo.fileTransferId);
          break;
        }
      } else {
        checkStamp = stamp;
      }
    }
  }

  private initSendFile(
    fileUpload: FileUpload,
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string,
  ) {
    fileUpload.button.addEventListener("click", () => {
      if (fileUpload.input.files) {
        for (let i = 0; i < fileUpload.input.files.length; i++) {
          const fileName = fileUpload.input.files.item(i)?.name;
          const fileSize = fileUpload.input.files.item(i)?.size;
          const fileStream = fileUpload.input.files.item(i)?.stream();
          if (fileName && fileSize && fileStream) {
            console.log(`file name: ${fileName} | size: ${fileSize}`);
            this.startSendFile(
              device,
              socket,
              desktopId,
              fileName,
              fileSize,
              fileStream,
            );
          }
        }
      } else {
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
    fileStream: ReadableStream<Uint8Array>,
  ): Promise<void> {
    const init = initSendFileTransfer(socket, desktopId);
    const fileTransferId = await init();
    const transport = await createSendFileTransport(
      device,
      socket,
      fileTransferId,
    );

    const producer = await getSendFileProducer(transport);

    const reader = fileStream.getReader();
    // producer.on("close", () => {
    //     reader.releaseLock();
    //     fileStream.cancel();
    // });

    const status = await WaitFileConsumer(
      socket,
      fileTransferId,
      fileName,
      fileSize,
    );
    if (status === fileTransferId) {
      if (producer.readyState === "open") {
        await this.sendFile(producer, reader, fileSize);
      } else {
        producer.on("open", async () => {
          await this.sendFile(producer, reader, fileSize);
        });
      }
    }
  }

  private async sendFile(
    producer: mediasoupClient.types.DataProducer,
    reader: ReadableStreamDefaultReader<Uint8Array>,
    fileSize: number,
  ): Promise<void> {
    const id = getRandomInt(appMaxId);
    const chunkSize = appMax - appHeader;
    let order = 0;
    let total = 0;
    // eslint-disable-next-line no-constant-condition
    while (1) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value.byteLength > chunkSize) {
        let sliceOffset = 0;
        console.log(`Buffer Size Over`);
        while (sliceOffset < value.byteLength) {
          const sliceBuf = value.slice(sliceOffset, sliceOffset + chunkSize);

          total += sliceBuf.byteLength;
          if (order === 0) {
            const appData = createAppProtocol(
              sliceBuf,
              id,
              appStatus.start,
              order,
            );
            producer.send(appData);
          } else if (total < fileSize) {
            const appData = createAppProtocol(
              sliceBuf,
              id,
              appStatus.middle,
              order,
            );
            producer.send(appData);
          } else {
            const appData = createAppProtocol(
              sliceBuf,
              id,
              appStatus.end,
              order,
            );
            producer.send(appData);
          }

          sliceOffset += sliceBuf.byteLength;
          order++;
          await timer(10);
        }
      } else {
        total += value.byteLength;
        if (order === 0) {
          const appData = createAppProtocol(value, id, appStatus.start, order);
          producer.send(appData);
        } else if (total < fileSize) {
          const appData = createAppProtocol(value, id, appStatus.middle, order);
          producer.send(appData);
        } else {
          const appData = createAppProtocol(value, id, appStatus.end, order);
          producer.send(appData);
        }

        order++;
        await timer(10);
      }
    }
    reader.releaseLock();
  }
}
