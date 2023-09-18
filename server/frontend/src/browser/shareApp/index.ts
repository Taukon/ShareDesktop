import { Socket } from "socket.io-client";
import { Access } from "../signaling/type";
import {
  createDevice,
  reflectScreen,
  setAudioConsumer,
  setControlProducer,
  setScreenConsumer,
} from "./connect";
import { controlEventListener } from "../canvas";
import { Device } from "mediasoup-client";
export class ShareApp {
  public device?: Device;
  public desktopId: string;

  public canvas: HTMLCanvasElement;
  public image: HTMLImageElement;
  public audio?: HTMLAudioElement;

  constructor(desktopId: string) {
    this.desktopId = desktopId;

    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("tabindex", String(0));

    this.image = new Image();
    this.image.onload = () => {
      this.canvas.width = this.image.width;
      this.canvas.height = this.image.height;
      this.canvas.getContext("2d")?.drawImage(this.image, 0, 0);
    };
  }

  public async startShareApp(
    socket: Socket,
    access: Access,
    alreadyDevice?: Device,
  ): Promise<Device | undefined> {
    if (alreadyDevice) {
      console.log(`already have Device`);
      this.device = alreadyDevice;
      await this.loadSetting(
        socket,
        access,
        alreadyDevice,
        this.image,
        this.canvas,
      );

      return alreadyDevice;
    } else {
      const device = await createDevice(socket, access);
      if (device) {
        this.device = device;
        await this.loadSetting(socket, access, device, this.image, this.canvas);

        return device;
      }
    }
    return undefined;
  }

  private async loadSetting(
    socket: Socket,
    access: Access,
    device: Device,
    image: HTMLImageElement,
    canvas: HTMLCanvasElement,
  ): Promise<void> {
    const screenConsumer = await setScreenConsumer(device, socket, access);

    if (screenConsumer?.readyState === "open") {
      reflectScreen(screenConsumer, image);
    } else if (screenConsumer) {
      screenConsumer.on("open", () => {
        reflectScreen(screenConsumer, image);
      });
    }

    if (screenConsumer) {
      const producer = await setControlProducer(device, socket, access);
      if (producer?.readyState === "open") {
        controlEventListener(canvas, producer);
      } else if (producer) {
        producer.on("open", () => {
          controlEventListener(canvas, producer);
        });
      }
    }

    const audioConsumer = await setAudioConsumer(device, socket, access);
    if (audioConsumer) {
      this.audio = document.createElement("audio");
      const { track } = audioConsumer;
      this.audio.srcObject = new MediaStream([track]);
      this.audio.play();
    }
  }
}
