import { Socket } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import { controlEventListenerWID } from "../canvas";
import { ControlData } from "../../../util/type";
import {
  createDevice,
  setAlreadyDevice,
  setAudioProducer,
  setControl,
  setScreenProducer,
} from "./connect";
import { sendAppProtocol } from "../../../protocol/renderer";

export class ShareHostApp {
  public desktopId: string;
  public socket: Socket;
  public device?: mediasoupClient.types.Device;

  private intervalId?: NodeJS.Timeout;

  private interval: number;
  private onDisplayScreen: boolean;
  private windowId: number;

  public canvas = document.createElement("canvas");
  public video = document.createElement("video");
  public audioTrack?: MediaStreamTrack;

  // private device?: mediasoupClient.types.Device;

  constructor(
    windowId: number,
    desktopId: string,
    socket: Socket,
    interval: number,
    onDisplayScreen: boolean,
    videoStream: MediaStream,
    audioTrack?: MediaStreamTrack,
  ) {
    this.desktopId = desktopId;
    this.socket = socket;

    this.canvas.setAttribute("tabindex", String(0));
    this.video.srcObject = videoStream;
    this.video.onloadedmetadata = () => this.video.play();

    this.audioTrack = audioTrack;

    this.interval = interval;
    this.onDisplayScreen = onDisplayScreen;
    this.windowId = windowId;
  }

  public async startShareApp(
    alreadyDevice?: mediasoupClient.types.Device,
  ): Promise<mediasoupClient.types.Device | undefined> {
    if (alreadyDevice) {
      console.log(`already have Device`);
      this.device = alreadyDevice;
      await setAlreadyDevice(this.socket, this.desktopId);
      const displayName = await window.shareApp.getXDisplayEnv();
      if (displayName) {
        this.startScreen(
          alreadyDevice,
          this.socket,
          this.desktopId,
          this.canvas,
          this.video,
          this.interval,
        );

        const control = (data: ControlData) =>
          window.shareApp.controlWID(displayName, this.windowId, data);
        setControl(alreadyDevice, this.socket, this.desktopId, control);
        if (this.onDisplayScreen) {
          controlEventListenerWID(this.canvas, displayName, this.windowId);
        }

        if (this.audioTrack) {
          await this.startAudio(
            alreadyDevice,
            this.socket,
            this.desktopId,
            this.audioTrack,
          );
        }
      }
    } else {
      const displayName = await window.shareApp.getXDisplayEnv();
      const device = await createDevice(this.socket, this.desktopId);

      if (device && displayName) {
        this.device = device;

        this.startScreen(
          device,
          this.socket,
          this.desktopId,
          this.canvas,
          this.video,
          this.interval,
        );

        const control = (data: ControlData) =>
          window.shareApp.controlWID(displayName, this.windowId, data);
        setControl(device, this.socket, this.desktopId, control);
        if (this.onDisplayScreen) {
          controlEventListenerWID(this.canvas, displayName, this.windowId);
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
    desktopId: string,
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    interval: number,
  ): Promise<void> {
    const producer = await setScreenProducer(device, socket, desktopId);

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
          const jpegBuffer = new Uint8Array(
            atob(base64Jpeg)
              .split("")
              .map((char) => char.charCodeAt(0)),
          );
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

  private async startAudio(
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string,
    audioTrack: MediaStreamTrack,
  ): Promise<void> {
    await setAudioProducer(device, socket, desktopId, audioTrack);
  }
}
