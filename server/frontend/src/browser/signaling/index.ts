import * as mediasoupClient from "mediasoup-client";
import { Socket } from "socket.io-client";
import {
  ConsumeDataParams,
  ConsumeParams,
  ProduceDataParam,
  TransportParams,
} from "../mediasoup/type";
import { Access, ClientInfo, FileInfo, Signaling } from "./type";

const sendRequest = async <T>(
  socket: Socket,
  type: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
): Promise<T> => {
  return new Promise((resolve) => {
    socket.emit(type, data, (res: T) => resolve(res));
  });
};

export const reqConnect = (socket: Socket, info: ClientInfo): void => {
  socket.emit("reqRtpCap", info);
};

// ------- Control

export const createMediaControl = (
  socket: Socket,
  access: Access,
): Signaling<void, TransportParams | undefined> => {
  return () => sendRequest(socket, "createMediaControl", access);
};

export const connectMediaControl = (
  socket: Socket,
  access: Access,
): Signaling<mediasoupClient.types.DtlsParameters, void> => {
  return (dtlsParameters: mediasoupClient.types.DtlsParameters) =>
    sendRequest(socket, "connectMediaControl", {
      access: access,
      dtlsParameters: dtlsParameters,
    });
};

export const establishMediaControl = (
  socket: Socket,
  access: Access,
): Signaling<ProduceDataParam, string> => {
  return (params: ProduceDataParam) =>
    sendRequest(socket, "establishMediaControl", {
      access: access,
      produceParameters: params,
    });
};

// ------ Screen

export const createMediaScreen = (
  socket: Socket,
  access: Access,
): Signaling<void, TransportParams | undefined> => {
  return () =>
    sendRequest(socket, "createMediaScreenOrAudio", {
      access: access,
      isAudio: false,
    });
};

export const connectMediaScreen = (
  socket: Socket,
  access: Access,
): Signaling<mediasoupClient.types.DtlsParameters, void> => {
  return (dtlsParameters: mediasoupClient.types.DtlsParameters) =>
    sendRequest(socket, "connectMediaScreenOrAudio", {
      access: access,
      dtlsParameters: dtlsParameters,
      isAudio: false,
    });
};

export const establishMediaScreen = (
  socket: Socket,
  access: Access,
): Signaling<void, ConsumeDataParams | undefined> => {
  return () => sendRequest(socket, "establishMediaScreen", access);
};

// ------- Audio

export const createMediaAudio = (
  socket: Socket,
  access: Access,
): Signaling<void, TransportParams | undefined> => {
  return () =>
    sendRequest(socket, "createMediaScreenOrAudio", {
      access: access,
      isAudio: true,
    });
};

export const connectMediaAudio = (
  socket: Socket,
  access: Access,
): Signaling<mediasoupClient.types.DtlsParameters, void> => {
  return (dtlsParameters: mediasoupClient.types.DtlsParameters) =>
    sendRequest(socket, "connectMediaScreenOrAudio", {
      access: access,
      dtlsParameters: dtlsParameters,
      isAudio: true,
    });
};

export const establishMediaAudio = (
  socket: Socket,
  access: Access,
  rtpCapabilities: mediasoupClient.types.RtpCapabilities,
): Signaling<void, ConsumeParams | undefined> => {
  return () =>
    sendRequest(socket, "establishMediaAudio", {
      access: access,
      rtpCapabilities: rtpCapabilities,
    });
};

// ------ FileWatch

export const createBrowserFileWatch = (
  socket: Socket,
  access: Access,
): Signaling<void, TransportParams | undefined> => {
  return () => sendRequest(socket, "createFileWatch", access);
};

export const connectBrowserFileWatch = (
  socket: Socket,
  access: Access,
): Signaling<mediasoupClient.types.DtlsParameters, void> => {
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

// -------- SendFile --------

export const initSendFileTransfer = (
  socket: Socket,
  access: Access,
): Signaling<void, string> => {
  return () => sendRequest(socket, "initSendFileTransfer", access);
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
): Signaling<mediasoupClient.types.DtlsParameters, void> => {
  return (dtlsParameters: mediasoupClient.types.DtlsParameters) =>
    sendRequest(socket, "connectSendFile", {
      fileTransferId: fileTransferId,
      dtlsParameters: dtlsParameters,
    });
};

export const establishSendFile = (
  socket: Socket,
  fileTransferId: string,
): Signaling<ProduceDataParam, string> => {
  return (params: ProduceDataParam) =>
    sendRequest(socket, "establishSendFile", {
      fileTransferId: fileTransferId,
      produceParameters: params,
    });
};

export const waitSetFileConsumer = (
  socket: Socket,
  fileInfo: FileInfo,
): Signaling<void, string> => {
  return () => sendRequest(socket, "waitFileConsumer", fileInfo);
};

// -------- RecvFile --------

export const initRecvFileTransfer = (
  socket: Socket,
  access: Access,
  fileName: string,
): Signaling<void, FileInfo> => {
  return () =>
    sendRequest(socket, "initRecvFileTransfer", { access, fileName });
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
): Signaling<mediasoupClient.types.DtlsParameters, void> => {
  return (dtlsParameters: mediasoupClient.types.DtlsParameters) =>
    sendRequest(socket, "connectRecvFile", {
      fileTransferId: fileTransferId,
      dtlsParameters: dtlsParameters,
    });
};

export const establishRecvFile = (
  socket: Socket,
  fileTransferId: string,
): Signaling<void, ConsumeDataParams> => {
  return () => sendRequest(socket, "establishRecvFile", fileTransferId);
};

export const setFileConsumer = (
  socket: Socket,
  fileTransferId: string,
): Socket => {
  return socket.emit("setFileConsumer", fileTransferId);
};
