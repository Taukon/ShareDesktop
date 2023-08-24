import { Socket } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
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
  WaitFileConsumer,
} from "./desktop";
import { Buffer } from "buffer";
import { controlEventListener } from "./canvas";
import { ControlData } from "../../util/type";
import { establishDesktopAudio, setFileConsumer } from "./signaling";
import { FileInfo } from "./signaling/type";
import { FileProducers } from "./mediasoup/type";
import { sendAppProtocol, timer } from "../../util";
import { updateFiles } from "./fileShare";
import { FileWatchList, FileWatchMsg } from "./fileShare/type";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.Buffer = Buffer;

export class DesktopWebRTCUserMedia {
  public desktopId: string;
  public socket: Socket;

  private displayName: string;
  private intervalId?: NodeJS.Timer;

  public canvas = document.createElement("canvas");
  public video = document.createElement("video");
  public audio?: HTMLAudioElement;

  private ffmpegPid?: number; // ---ffmpeg process
  // // --- for ffmpeg
  private pulseAudioDevice = 1;
  // // --- end ffmpeg

  private fileProducers: FileProducers = {};
  private device?: mediasoupClient.types.Device;

  constructor(
    displayNum: number,
    desktopId: string,
    socket: Socket,
    interval: number,
    onDisplayScreen: boolean,
    videoStream: MediaStream,
    onAudio: boolean,
  ) {
    this.displayName = `:${displayNum}`;

    this.desktopId = desktopId;
    this.socket = socket;

    this.canvas.setAttribute("tabindex", String(0));
    this.video.srcObject = videoStream;
    this.video.onloadedmetadata = () => this.video.play();

    createDevice(socket, desktopId).then((device) => {
      this.startScreen(
        device,
        socket,
        desktopId,
        this.canvas,
        this.video,
        interval,
      );

      this.startControl(device, socket, desktopId, this.displayName);
      if (onDisplayScreen) {
        controlEventListener(this.canvas, this.displayName);
      }

      if (onAudio) {
        this.startAudio(socket, desktopId).then((ffmpegPid) => {
          this.ffmpegPid = ffmpegPid;
        });
      }

      this.device = device;
    });
  }

  public deleteDesktop(): void {
    if (this.ffmpegPid) {
      window.desktop.stopAudio(this.ffmpegPid);
    }

    console.log("disconnect clear intervalId: " + this.intervalId);
    clearInterval(this.intervalId);
  }

  private async startScreen(
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string,
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    interval: number,
  ): Promise<void> {
    const transport = await createScreenTransport(device, socket, desktopId);
    const producer = await getScreenProducer(transport);

    if (producer.readyState === "open") {
      this.intervalId = this.loopGetScreen(producer, canvas, video, interval);
    } else {
      producer.on("open", () => {
        this.intervalId = this.loopGetScreen(producer, canvas, video, interval);
      });
    }
  }

  private loopGetScreen(
    producer: mediasoupClient.types.DataProducer,
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    interval: number,
  ): NodeJS.Timer | undefined {
    // let preJpegBuffer = Buffer.alloc(0);
    let preBase64Jpeg: string;

    return setInterval(async () => {
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0);

        const base64Jpeg = canvas
          // .toDataURL("image/jpeg")
          .toDataURL("image/jpeg", 0.7)
          .replace(/^data:\w+\/\w+;base64,/, "");
        // const jpegBuffer = Buffer.from(base64Jpeg, "base64");

        // if (Buffer.compare(jpegBuffer, preJpegBuffer) != 0) {
        if (base64Jpeg != preBase64Jpeg) {
          const jpegBuffer = Buffer.from(base64Jpeg, "base64");
          await sendAppProtocol(jpegBuffer, async (buf) => {
            producer.send(buf);
          });
          // preJpegBuffer = jpegBuffer;
          preBase64Jpeg = base64Jpeg;
        }
      } catch (err) {
        console.log(err);
      }
    }, interval);
  }

  private async startControl(
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string,
    displayName: string,
  ): Promise<void> {
    const transport = await createControlTransport(device, socket, desktopId);
    const consumer = await getControlConsumer(transport, socket, desktopId);

    consumer.on("message", (msg) => {
      const buf = Buffer.from(msg as ArrayBuffer);
      const data: ControlData = JSON.parse(buf.toString());

      window.desktop.testControl(displayName, data);
    });
  }

  private async startAudio(
    socket: Socket,
    desktopId: string,
  ): Promise<number | undefined> {
    const params = await establishDesktopAudio(socket, desktopId);

    // const buf = Buffer.from(data as ArrayBuffer);
    // const msg = JSON.parse(buf.toString());
    const msg = params;
    console.log(msg);

    const ffmpegPid = await window.desktop.getAudio(this.pulseAudioDevice, msg);
    return ffmpegPid;
  }

  public async startFileShare(
    dir: string,
    fileList: FileWatchList,
  ): Promise<boolean> {
    if ((await window.fileShare.initFileWatch(dir)) && this.device) {
      this.startFileWatch(
        this.device,
        this.socket,
        this.desktopId,
        dir,
        fileList,
      );

      this.onSendFile(this.device, this.socket);
      this.onRecvFile(this.device, this.socket);
      return true;
    }
    return false;
  }

  private async startFileWatch(
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string,
    dir: string,
    fileList: FileWatchList,
  ): Promise<void> {
    const transport = await createFileWatchTransport(device, socket, desktopId);
    const producer = await getFileWatchProducer(transport);
    if (producer.readyState === "open") {
      window.fileShare.streamFileWatchMsg((data: FileWatchMsg) => {
        producer.send(JSON.stringify(data));
        updateFiles(fileList, data);
      });
      await window.fileShare.sendFileWatch(dir);
    } else {
      producer.on("open", async () => {
        window.fileShare.streamFileWatchMsg((data: FileWatchMsg) => {
          producer.send(JSON.stringify(data));
          updateFiles(fileList, data);
        });
        await window.fileShare.sendFileWatch(dir);
      });
    }

    socket.on("requestFileWatch", async () => {
      await window.fileShare.sendFileWatch(dir);
    });
  }

  private async onSendFile(
    device: mediasoupClient.types.Device,
    socket: Socket,
  ) {
    window.fileShare.streamSendFileBuffer(
      (data: { fileTransferId: string; buf: Uint8Array }) => {
        const producer = this.fileProducers[data.fileTransferId];
        if (producer) {
          producer.send(data.buf);
        }
      },
    );

    socket.on(
      "requestSendFile",
      async (fileTransferId: string, fileName: string) => {
        console.log(`Receive request Send File! ID: ${fileTransferId}`);

        const transport = await createSendFileTransport(
          device,
          socket,
          fileTransferId,
        );
        const producer = await getSendFileProducer(transport);

        this.fileProducers[fileTransferId] = producer;
        const fileInfo = await window.fileShare.getFileInfo(fileName);
        if (fileInfo) {
          await WaitFileConsumer(
            socket,
            fileTransferId,
            fileInfo.fileName,
            fileInfo.fileSize,
          );

          producer.on("close", () => {
            transport.close();
            delete this.fileProducers[fileTransferId];
          });

          if (producer.readyState === "open") {
            const result = await window.fileShare.sendFileBuffer(
              fileInfo.fileName,
              fileTransferId,
            );
            if (!result) socket.emit("endTransferFile", fileTransferId);
          } else {
            producer.on("open", async () => {
              const result = await window.fileShare.sendFileBuffer(
                fileInfo.fileName,
                fileTransferId,
              );
              if (!result) socket.emit("endTransferFile", fileTransferId);
            });
          }
        } else {
          socket.emit("endTransferFile", fileTransferId);
        }
      },
    );
  }

  private async onRecvFile(
    device: mediasoupClient.types.Device,
    socket: Socket,
  ) {
    socket.on("requestRecvFile", async (fileInfo: FileInfo) => {
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

      const isSet = await window.fileShare.setFileInfo(
        fileInfo.fileName,
        fileInfo.fileSize,
      );
      console.log(`isSet: ${isSet}`);
      if (!isSet) {
        socket.emit("endTransferFile", fileInfo.fileTransferId);
        return;
      }

      if (consumer.readyState === "open") {
        this.receiveFile(consumer, socket, fileInfo);
        setFileConsumer(socket, fileInfo.fileTransferId);
      } else {
        consumer.on("open", () => {
          this.receiveFile(consumer, socket, fileInfo);
          setFileConsumer(socket, fileInfo.fileTransferId);
        });
      }
    });
  }

  public async receiveFile(
    consumer: mediasoupClient.types.DataConsumer,
    socket: Socket,
    fileInfo: FileInfo,
  ) {
    let stamp = 0;
    let checkStamp = 0;
    let limit = 3;
    let isClosed = false;

    consumer.on("message", async (msg: ArrayBuffer) => {
      stamp++;
      const buf = new Uint8Array(msg);
      const receivedSize = await window.fileShare.recvFileBuffer(
        fileInfo.fileName,
        buf,
      );
      // console.log(`${fileInfo.fileName} stamp: ${stamp}`);
      if (receivedSize === fileInfo.fileSize) {
        isClosed = true;
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
          window.fileShare.destroyRecvFileBuffer(fileInfo.fileName);
          socket.emit("endTransferFile", fileInfo.fileTransferId);
          break;
        }
      } else {
        checkStamp = stamp;
      }
    }
  }
}
