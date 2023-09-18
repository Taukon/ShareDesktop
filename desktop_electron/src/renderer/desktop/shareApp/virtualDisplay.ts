import { Socket } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import { Buffer } from "buffer";
import { controlEventListener, displayScreen } from "../canvas";
import { ControlData } from "../../../util/type";
import {
  createDevice,
  setAlreadyDevice,
  setAudioProducer,
  setControl,
  setScreenProducer,
} from "./connect";
import { sendAppProtocol } from "../../../protocol/main";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.Buffer = Buffer;

export class ShareVirtualApp {
  public desktopId: string;
  public socket: Socket;
  public device?: mediasoupClient.types.Device;

  private displayName: string;
  private intervalId?: NodeJS.Timeout;

  private interval: number;
  private onDisplayScreen: boolean;
  private isFullScreen: boolean;

  public canvas = document.createElement("canvas");
  public image = new Image();

  public audioTrack?: MediaStreamTrack;

  constructor(
    displayNum: number,
    desktopId: string,
    socket: Socket,
    interval: number,
    onDisplayScreen: boolean,
    isFullScreen: boolean,
    audioTrack?: MediaStreamTrack,
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

    this.interval = interval;
    this.onDisplayScreen = onDisplayScreen;
    this.isFullScreen = isFullScreen;
    this.audioTrack = audioTrack;
  }

  public async startShareApp(
    alreadyDevice?: mediasoupClient.types.Device,
  ): Promise<mediasoupClient.types.Device | undefined> {
    if (alreadyDevice) {
      console.log(`already have Device`);
      this.device = alreadyDevice;
      await setAlreadyDevice(this.socket, this.desktopId);

      this.startScreen(
        alreadyDevice,
        this.socket,
        this.image,
        this.desktopId,
        this.displayName,
        this.interval,
        this.onDisplayScreen,
        this.isFullScreen,
      );

      const control = (data: ControlData) =>
        window.shareApp.control(this.displayName, data);
      setControl(alreadyDevice, this.socket, this.desktopId, control);
      if (this.onDisplayScreen) {
        controlEventListener(this.canvas, this.displayName);
      }

      if (this.audioTrack) {
        await this.startAudio(
          alreadyDevice,
          this.socket,
          this.desktopId,
          this.audioTrack,
        );
      }
    } else {
      const device = await createDevice(this.socket, this.desktopId);
      if (device) {
        this.device = device;

        this.startScreen(
          device,
          this.socket,
          this.image,
          this.desktopId,
          this.displayName,
          this.interval,
          this.onDisplayScreen,
          this.isFullScreen,
        );

        const control = (data: ControlData) =>
          window.shareApp.control(this.displayName, data);
        setControl(device, this.socket, this.desktopId, control);
        if (this.onDisplayScreen) {
          controlEventListener(this.canvas, this.displayName);
        }

        if (this.audioTrack) {
          await this.startAudio(
            device,
            this.socket,
            this.desktopId,
            this.audioTrack,
          );
        }
      }
      return device;
    }
  }

  public deleteDesktop(): void {
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
    const producer = await setScreenProducer(device, socket, desktopId);

    if (producer) {
      this.intervalId = this.loopGetScreen(
        producer,
        image,
        displayName,
        interval,
        onDisplayScreen,
        isFullScreen
          ? window.shareApp.getX11FullScreenshot
          : window.shareApp.getX11Screenshot,
      );
    }

    if (producer?.readyState === "open") {
      this.intervalId = this.loopGetScreen(
        producer,
        image,
        displayName,
        interval,
        onDisplayScreen,
        isFullScreen
          ? window.shareApp.getX11FullScreenshot
          : window.shareApp.getX11Screenshot,
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
            ? window.shareApp.getX11FullScreenshot
            : window.shareApp.getX11Screenshot,
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

  private async startAudio(
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string,
    audioTrack: MediaStreamTrack,
  ): Promise<void> {
    await setAudioProducer(device, socket, desktopId, audioTrack);
  }
}
