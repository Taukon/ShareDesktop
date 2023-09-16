import { Socket } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import { loadDevice, setDataConsumer, setDataProducer } from "../mediasoup";
import { ControlData } from "../../../util/type";
import {
  connectDesktopControl,
  connectDesktopScreen,
  createDesktopControl,
  createDesktopScreen,
  establishDesktopAudio,
  establishDesktopControl,
  establishDesktopScreen,
  getRtpCapApp,
} from "../signaling/shareApp";
import { decodeParseData, parseAppProtocol } from "../../../protocol/renderer";
import { appStatus } from "../../../protocol/common";

export const createDevice = async (
  socket: Socket,
  desktopId: string,
): Promise<mediasoupClient.types.Device | undefined> => {
  const forDevice = getRtpCapApp(socket, desktopId);
  const device = await loadDevice(forDevice);
  return device;
};

export const setAlreadyDevice = async (
  socket: Socket,
  desktopId: string,
): Promise<boolean> => {
  const forAlreadyDevice = getRtpCapApp(socket, desktopId);
  const notUse = await forAlreadyDevice();
  if (notUse) {
    return true;
  } else {
    return false;
  }
};

// ----- Control
const setControlConsumer = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  desktopId: string,
): Promise<mediasoupClient.types.DataConsumer | undefined> => {
  const forTransport = createDesktopControl(socket, desktopId);
  const forConnect = connectDesktopControl(socket, desktopId);
  const forConsumeData = establishDesktopControl(socket, desktopId);
  const consumer = await setDataConsumer(
    device,
    forTransport,
    forConnect,
    forConsumeData,
  );

  return consumer;
};

export const setControl = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  desktopId: string,
  control: (data: ControlData) => Promise<void>,
): Promise<mediasoupClient.types.DataConsumer | undefined> => {
  const consumer = await setControlConsumer(device, socket, desktopId);

  if (consumer?.readyState === "open") {
    consumer.on("message", (msg) => {
      const parse = parseAppProtocol(Buffer.from(msg as ArrayBuffer));

      if (parse.status === appStatus.control) {
        const data: ControlData = decodeParseData(parse.data);

        control(data);
      }
    });
  } else if (consumer) {
    consumer.on("open", () => {
      consumer.on("message", (msg) => {
        const parse = parseAppProtocol(new Uint8Array(msg as ArrayBuffer));

        if (parse.status === appStatus.control) {
          const data: ControlData = decodeParseData(parse.data);

          control(data);
        }
      });
    });
  }

  return consumer;
};

// ----- Screen
export const setScreenProducer = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  desktopId: string,
): Promise<mediasoupClient.types.DataProducer | undefined> => {
  const forTransport = createDesktopScreen(socket, desktopId);
  const forConnect = connectDesktopScreen(socket, desktopId);
  const forProducedata = establishDesktopScreen(socket, desktopId);
  const producer = await setDataProducer(
    device,
    forTransport,
    forConnect,
    forProducedata,
    { ordered: false, maxRetransmits: 0 },
  );

  return producer;
};

// ----- Audio
export const setAudio = async (
  socket: Socket,
  desktopId: string,
  pulseAudioDevice: number,
): Promise<number | undefined> => {
  const params = await establishDesktopAudio(socket, desktopId);

  // const buf = Buffer.from(data as ArrayBuffer);
  // const msg = JSON.parse(buf.toString());
  if (params) {
    const msg = params;
    console.log(msg);

    const ffmpegPid = await window.shareApp.getAudio(pulseAudioDevice, msg);
    return ffmpegPid;
  }
  return undefined;
};
