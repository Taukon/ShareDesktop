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
import { controlEventListener, displayScreen } from "./canvas";
import { FileInfo } from "./signaling/type";
import { FileProducers } from "./mediasoup/type";
import { sendAppProtocol } from "../../util";
import { FileWatchList } from "./fileShare/type";
import { ControlData } from "../../util/type";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.Buffer = Buffer;

export class DesktopWebRTCXvfb {
  public desktopId: string;
  public socket: Socket;

  private displayName: string;
  private intervalId?: NodeJS.Timeout;

  public canvas = document.createElement("canvas");
  public image = new Image();
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
    isFullScreen: boolean,
    onAudio: boolean,
    password: string,
  ) {
    this.displayName = `:${displayNum}`;

    this.desktopId = desktopId;
    this.socket = socket;

    this.canvas.setAttribute("tabindex", String(0));
    this.image.onload = () => {
      this.canvas.width = this.image.width;
      this.canvas.height = this.image.height;
      this.canvas.getContext("2d")?.drawImage(this.image, 0, 0);
    };

    createDevice(socket, desktopId).then((device) => {
      listenAuth(socket, desktopId, password);

      this.startScreen(
        device,
        socket,
        this.image,
        desktopId,
        this.displayName,
        interval,
        onDisplayScreen,
        isFullScreen,
      );

      const control = (data: ControlData) =>
        window.desktop.control(this.displayName, data);
      setControl(device, socket, desktopId, control);
      if (onDisplayScreen) {
        controlEventListener(this.canvas, this.displayName);
      }

      if (onAudio) {
        setAudio(socket, desktopId, this.pulseAudioDevice).then((ffmpegPid) => {
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
    image: HTMLImageElement,
    desktopId: string,
    displayName: string,
    interval: number,
    onDisplayScreen: boolean,
    isFullScreen: boolean,
  ): Promise<void> {
    const producer = await setScreen(device, socket, desktopId);

    if (producer?.readyState === "open") {
      this.intervalId = this.loopGetScreen(
        producer,
        image,
        displayName,
        interval,
        onDisplayScreen,
        isFullScreen
          ? window.desktop.getX11FullScreenshot
          : window.desktop.getX11Screenshot,
      );
    } else if (producer) {
      producer.on("open", () => {
        this.intervalId = this.loopGetScreen(
          producer,
          image,
          displayName,
          interval,
          onDisplayScreen,
          isFullScreen
            ? window.desktop.getX11FullScreenshot
            : window.desktop.getX11Screenshot,
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
    screenShot: (displayName: string) => Promise<Buffer | undefined>,
  ): NodeJS.Timeout | undefined {
    let preImg = Buffer.alloc(0);

    return setInterval(async () => {
      try {
        const img = await screenShot(displayName);
        if (img) {
          if (Buffer.compare(img, preImg) != 0) {
            if (onDisplayScreen) {
              displayScreen(image, img);
            }
            await sendAppProtocol(img, async (buf) => {
              producer.send(buf);
            });
            preImg = Buffer.from(img.buffer);
          }
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
