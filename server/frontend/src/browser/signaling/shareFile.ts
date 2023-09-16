import * as mediasoupClient from "mediasoup-client";
import { Socket } from "socket.io-client";
import {
  ConsumeDataParams,
  ProduceDataParam,
  TransportParams,
} from "../mediasoup/type";
import { Access, Signaling } from "./type";
import { sendRequest } from "./common";

export const getRtpCapFile = (
  socket: Socket,
  access: Access,
): Signaling<void, mediasoupClient.types.RtpCapabilities | undefined> => {
  return () => sendRequest(socket, "getRtpCapFile", access);
};

// -------- FileWatch --------

export const sendJoinFileWatch = (socket: Socket, access: Access): void => {
  socket.emit("requestFileWatch", access);
};

export const createBrowserFileWatch = (
  socket: Socket,
  access: Access,
): Signaling<void, TransportParams | undefined> => {
  return () => sendRequest(socket, "createFileWatch", access);
};

export const connectBrowserFileWatch = (
  socket: Socket,
  access: Access,
): Signaling<mediasoupClient.types.DtlsParameters, boolean> => {
  return (dtlsParameters: mediasoupClient.types.DtlsParameters) =>
    sendRequest(socket, "connectFileWatch", {
      access: access,
      dtlsParameters: dtlsParameters,
    });
};

export const establishBrowserFileWatch = (
  socket: Socket,
  access: Access,
): Signaling<void, ConsumeDataParams | undefined> => {
  return () => sendRequest(socket, "establishFileWatch", access);
};

// -------- FileTransfer --------

export const requestTransfer = (
  socket: Socket,
  access: Access,
): Signaling<void, string | undefined> => {
  return () => sendRequest(socket, "reqTransfer", access);
};

export const endTransferFile = (
  socket: Socket,
  fileTransferId: string,
): void => {
  socket.emit("endTransferFile", fileTransferId);
};

export const setFileWebProducer = (
  socket: Socket,
  fileTransferId: string,
  access: Access,
): void => {
  socket.emit("setFileWebProducer", fileTransferId, access);
};

export const listenDtpFileProducer = (
  socket: Socket,
  callback: (fileTransferId: string) => Promise<void>,
): void => {
  socket.on("setFileDtpProducer", async (fileTransferId: string) => {
    await callback(fileTransferId);
  });
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
