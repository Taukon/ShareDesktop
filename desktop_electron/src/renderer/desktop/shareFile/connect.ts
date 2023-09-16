import { Socket } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import { loadDevice, setDataConsumer, setDataProducer } from "../mediasoup";
import {
  connectDesktopFileWatch,
  connectRecvFile,
  connectSendFile,
  createDesktopFileWatch,
  createRecvFile,
  createSendFile,
  establishDesktopFileWatch,
  establishRecvFile,
  establishSendFile,
} from "../signaling/shareFile";
import { getRtpCapFile } from "../signaling/shareFile";

export const createDevice = async (
  socket: Socket,
  desktopId: string,
): Promise<mediasoupClient.types.Device | undefined> => {
  const forDevice = getRtpCapFile(socket, desktopId);
  const device = await loadDevice(forDevice);
  return device;
};

export const setAlreadyDevice = async (
  socket: Socket,
  desktopId: string,
): Promise<boolean> => {
  const forAlreadyDevice = getRtpCapFile(socket, desktopId);
  const notUse = await forAlreadyDevice();
  if (notUse) {
    return true;
  } else {
    return false;
  }
};

// ----- FileWatch
export const createFileWatchProducer = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  desktopId: string,
): Promise<mediasoupClient.types.DataProducer | undefined> => {
  const forTransport = createDesktopFileWatch(socket, desktopId);
  const forConnect = connectDesktopFileWatch(socket, desktopId);
  const forProducedata = establishDesktopFileWatch(socket, desktopId);
  const producer = await setDataProducer(
    device,
    forTransport,
    forConnect,
    forProducedata,
  );

  return producer;
};

// ----- SendFile
export const createFileProducer = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  fileTransferId: string,
): Promise<mediasoupClient.types.DataProducer | undefined> => {
  const forTransport = createSendFile(socket, fileTransferId);
  const forConnect = connectSendFile(socket, fileTransferId);
  const forProducedata = establishSendFile(socket, fileTransferId);
  const producer = await setDataProducer(
    device,
    forTransport,
    forConnect,
    forProducedata,
  );

  return producer;
};

// ----- RecvFile
export const createFileConsumer = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  fileTransferId: string,
): Promise<mediasoupClient.types.DataConsumer | undefined> => {
  const forTransport = createRecvFile(socket, fileTransferId);
  const forConnect = connectRecvFile(socket, fileTransferId);
  const forConsumeData = establishRecvFile(socket, fileTransferId);
  const consumer = await setDataConsumer(
    device,
    forTransport,
    forConnect,
    forConsumeData,
  );

  return consumer;
};
