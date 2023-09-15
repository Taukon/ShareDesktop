import * as mediasoupClient from "mediasoup-client";
import { Socket } from "socket.io-client";
import {
  loadDevice,
  setConsumer,
  setDataConsumer,
  setDataProducer,
} from "../mediasoup";
import {
  connectMediaAudio,
  connectMediaControl,
  connectMediaScreen,
  createMediaAudio,
  createMediaControl,
  createMediaScreen,
  establishMediaAudio,
  establishMediaControl,
  establishMediaScreen,
  getRtpCapApp,
} from "../signaling/shareApp";
import { Access } from "../signaling/type";
import { appStatus, appendBuffer, parseAppProtocol } from "../util";

export const createDevice = async (
  socket: Socket,
  access: Access,
): Promise<mediasoupClient.types.Device | undefined> => {
  const forDevice = getRtpCapApp(socket, access);
  const device = await loadDevice(forDevice);
  return device;
};

export const setAlreadyDevice = async (
  socket: Socket,
  access: Access,
): Promise<boolean> => {
  const forAlreadyDevice = getRtpCapApp(socket, access);
  const notUse = await forAlreadyDevice();
  if (notUse) {
    return true;
  } else {
    return false;
  }
};

// -------- Control

export const setControlProducer = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  access: Access,
): Promise<mediasoupClient.types.DataProducer | undefined> => {
  const forTransport = createMediaControl(socket, access);
  const forConnect = connectMediaControl(socket, access);
  const forProduceData = establishMediaControl(socket, access);

  const producer = await setDataProducer(
    device,
    forTransport,
    forConnect,
    forProduceData,
  );

  return producer;
};

// ------- Screen
export const setScreenConsumer = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  access: Access,
): Promise<mediasoupClient.types.DataConsumer | undefined> => {
  const forTransport = createMediaScreen(socket, access);
  const forConnect = connectMediaScreen(socket, access);
  const forConsumeData = establishMediaScreen(socket, access);
  const consumer = await setDataConsumer(
    device,
    forTransport,
    forConnect,
    forConsumeData,
  );

  return consumer;
};

export const reflectScreen = (
  consumer: mediasoupClient.types.DataConsumer,
  image: HTMLImageElement,
): void => {
  let preId: number;
  let order: number = 0;
  let tmp: Uint8Array;

  consumer.on("message", (buf) => {
    const parse = parseAppProtocol(new Uint8Array(buf));
    if (parse.status === appStatus.once) {
      const imgBase64 = btoa(
        new Uint8Array(parse.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );
      image.src = "data:image/jpeg;base64," + imgBase64;
    } else if (parse.status === appStatus.start) {
      tmp = parse.data;
      preId = parse.id;
      order = parse.order + 1;
    } else if (
      parse.status === appStatus.middle &&
      parse.id === preId &&
      parse.order === order
    ) {
      tmp = appendBuffer(tmp, parse.data);
      order++;
    } else if (
      parse.status === appStatus.end &&
      parse.id === preId &&
      parse.order === order
    ) {
      tmp = appendBuffer(tmp, parse.data);
      const imgBase64 = btoa(
        new Uint8Array(tmp).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );
      image.src = "data:image/jpeg;base64," + imgBase64;
      tmp = new Uint8Array(0);
      order = 0;
    } else {
      order = 0;
      tmp = new Uint8Array(0);
    }
  });
};

// ------- Audio
export const setAudioConsumer = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  access: Access,
): Promise<mediasoupClient.types.Consumer | undefined> => {
  const forTransport = createMediaAudio(socket, access);
  const forConnect = connectMediaAudio(socket, access);
  const forConsume = establishMediaAudio(
    socket,
    access,
    device.rtpCapabilities,
  );
  const consumer = await setConsumer(
    device,
    forTransport,
    forConnect,
    forConsume,
  );

  return consumer;
};
