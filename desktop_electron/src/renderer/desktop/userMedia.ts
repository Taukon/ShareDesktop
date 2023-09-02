import { Socket } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import {
  createDevice,
  listenAuth,
  setAudio,
  setControl,
  setFileWatch,
  setRecvFile,
  setScreen,
  setSendFile,
} from "./desktop";
import { Buffer } from "buffer";
import { controlEventListenerWID } from "./canvas";
import { ControlData } from "../../util/type";
import { FileInfo } from "./signaling/type";
import { FileProducers } from "./mediasoup/type";
import { sendAppProtocol } from "../../util";
import { FileWatchList } from "./fileShare/type";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.Buffer = Buffer;

export class DesktopWebRTCUserMedia {
  public desktopId: string;
  public socket: Socket;

  private intervalId?: NodeJS.Timeout;

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
    windowId: number,
    desktopId: string,
    socket: Socket,
    interval: number,
    onDisplayScreen: boolean,
    videoStream: MediaStream,
    onAudio: boolean,
    password: string,
  ) {
    this.desktopId = desktopId;
    this.socket = socket;

    this.canvas.setAttribute("tabindex", String(0));
    this.video.srcObject = videoStream;
    this.video.onloadedmetadata = () => this.video.play();

    window.desktop.getXDisplayEnv().then((displayName) => {
      createDevice(socket, desktopId).then((device) => {
        listenAuth(socket, desktopId, password);

        this.startScreen(
          device,
          socket,
          desktopId,
          this.canvas,
          this.video,
          interval,
        );

        const control = (data: ControlData) =>
          window.desktop.controlWID(displayName, windowId, data);
        setControl(device, socket, desktopId, control);
        if (onDisplayScreen) {
          controlEventListenerWID(this.canvas, displayName, windowId);
        }

        if (onAudio) {
          setAudio(socket, desktopId, this.pulseAudioDevice).then(
            (ffmpegPid) => {
              this.ffmpegPid = ffmpegPid;
            },
          );
        }

        this.device = device;
      });
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
    const producer = await setScreen(device, socket, desktopId);

    if (producer?.readyState === "open") {
      this.intervalId = this.loopGetScreen(producer, canvas, video, interval);
    } else if (producer) {
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
  ): NodeJS.Timeout | undefined {
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

  public async startFileShare(
    dir: string,
    fileList: FileWatchList,
  ): Promise<boolean> {
    if ((await window.fileShare.initFileWatch(dir)) && this.device) {
      setFileWatch(this.device, this.socket, this.desktopId, dir, fileList);

      this.onFile(this.device, this.socket);
      return true;
    }
    return false;
  }

  private onFile(device: mediasoupClient.types.Device, socket: Socket) {
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
        const producer = await setSendFile(
          device,
          socket,
          fileTransferId,
          fileName,
        );
        if (producer) {
          producer.on("close", () => {
            delete this.fileProducers[fileTransferId];
          });
        }
      },
    );

    socket.on("requestRecvFile", async (fileInfo: FileInfo) => {
      await setRecvFile(device, socket, fileInfo);
    });
  }
}
