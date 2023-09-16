import { Socket } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import {
  ConsumeDataParams,
  ProduceDataParam,
  TransportParams,
} from "../mediasoup/type";
import { sendRequest } from "./common";
import { Signaling } from "./type";

export const getRtpCapFile = (
  socket: Socket,
  desktopId: string,
): Signaling<void, mediasoupClient.types.RtpCapabilities> => {
  return () => sendRequest(socket, "getRtpCapFile", desktopId);
};

// -------- DesktopFileWatch --------

export const listenJoinFileWatch = (socket: Socket, dir: string): void => {
  socket.on("requestFileWatch", async () => {
    await window.shareFile.sendFileWatch(dir);
  });
};

export const createDesktopFileWatch = (
  socket: Socket,
  desktopId: string,
): Signaling<void, TransportParams | undefined> => {
  return () => sendRequest(socket, "createFileWatch", desktopId);
};

export const connectDesktopFileWatch = (
  socket: Socket,
  desktopId: string,
): Signaling<mediasoupClient.types.DtlsParameters, boolean> => {
  return (dtlsParameters: mediasoupClient.types.DtlsParameters) =>
    sendRequest(socket, "connectFileWatch", {
      desktopId: desktopId,
      dtlsParameters: dtlsParameters,
    });
};

export const establishDesktopFileWatch = (
  socket: Socket,
  desktopId: string,
): Signaling<ProduceDataParam, string | undefined> => {
  return (params: ProduceDataParam) =>
    sendRequest(socket, "establishFileWatch", {
      desktopId: desktopId,
      produceParameters: params,
    });
};

// -------- DesktopFileTransfer --------

export const endTransferFile = (
  socket: Socket,
  fileTransferId: string,
): void => {
  socket.emit("endTransferFile", fileTransferId);
};

export const setFileDtpProducer = (
  socket: Socket,
  fileTransferId: string,
  browserId: string,
): void => {
  socket.emit("setFileDtpProducer", fileTransferId, browserId);
};

export const listenWebFileProducer = (
  socket: Socket,
  callback: (fileTransferId: string, browserId: string) => Promise<void>,
): void => {
  socket.on(
    "setFileWebProducer",
    async (fileTransferId: string, browserId: string) => {
      await callback(fileTransferId, browserId);
    },
  );
};

export const createSendFile = (
  socket: Socket,
  fileTransferId: string,
): Signaling<void, TransportParams | undefined> => {
  return () => sendRequest(socket, "createSendFile", fileTransferId);
};

export const connectSendFile = (
  socket: Socket,
  fileTransferId: string,
): Signaling<mediasoupClient.types.DtlsParameters, boolean> => {
  return (dtlsParameters: mediasoupClient.types.DtlsParameters) =>
    sendRequest(socket, "connectSendFile", {
      fileTransferId: fileTransferId,
      dtlsParameters: dtlsParameters,
    });
};

export const establishSendFile = (
  socket: Socket,
  fileTransferId: string,
): Signaling<ProduceDataParam, string | undefined> => {
  return (params: ProduceDataParam) =>
    sendRequest(socket, "establishSendFile", {
      fileTransferId: fileTransferId,
      produceParameters: params,
    });
};

export const createRecvFile = (
  socket: Socket,
  fileTransferId: string,
): Signaling<void, TransportParams | undefined> => {
  return () => sendRequest(socket, "createRecvFile", fileTransferId);
};

export const connectRecvFile = (
  socket: Socket,
  fileTransferId: string,
): Signaling<mediasoupClient.types.DtlsParameters, boolean> => {
  return (dtlsParameters: mediasoupClient.types.DtlsParameters) =>
    sendRequest(socket, "connectRecvFile", {
      fileTransferId: fileTransferId,
      dtlsParameters: dtlsParameters,
    });
};

export const establishRecvFile = (
  socket: Socket,
  fileTransferId: string,
): Signaling<void, ConsumeDataParams | undefined> => {
  return () => sendRequest(socket, "establishRecvFile", fileTransferId);
};
