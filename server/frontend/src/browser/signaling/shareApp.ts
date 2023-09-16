import * as mediasoupClient from "mediasoup-client";
import { Socket } from "socket.io-client";
import {
  ConsumeDataParams,
  ConsumeParams,
  ProduceDataParam,
  TransportParams,
} from "../mediasoup/type";
import { Access, Signaling } from "./type";
import { sendRequest } from "./common";

export const getRtpCapApp = (
  socket: Socket,
  access: Access,
): Signaling<void, mediasoupClient.types.RtpCapabilities | undefined> => {
  return () => sendRequest(socket, "getRtpCapApp", access);
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
): Signaling<mediasoupClient.types.DtlsParameters, boolean> => {
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
): Signaling<mediasoupClient.types.DtlsParameters, boolean> => {
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
