import { Socket } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import {
  ConsumeDataParams,
  ProduceDataParam,
  TransportParams,
} from "../mediasoup/type";
import { AudioResponse } from "../../../util/type";
import { Signaling } from "./type";
import { sendRequest } from "./common";

export const getRtpCapApp = (
  socket: Socket,
  desktopId: string,
): Signaling<void, mediasoupClient.types.RtpCapabilities> => {
  return () => sendRequest(socket, "getRtpCapApp", desktopId);
};

// -------- DesktopControl --------

export const createDesktopControl = (
  socket: Socket,
  desktopId: string,
): Signaling<void, TransportParams | undefined> => {
  return () => sendRequest(socket, "createDesktopControl", desktopId);
};

export const connectDesktopControl = (
  socket: Socket,
  desktopId: string,
): Signaling<mediasoupClient.types.DtlsParameters, boolean> => {
  return (dtlsParameters: mediasoupClient.types.DtlsParameters) =>
    sendRequest(socket, "connectDesktopControl", {
      desktopId: desktopId,
      dtlsParameters: dtlsParameters,
    });
};

export const establishDesktopControl = (
  socket: Socket,
  desktopId: string,
): Signaling<void, ConsumeDataParams | undefined> => {
  return () => sendRequest(socket, "establishDesktopControl", desktopId);
};

// -------- DesktopScreen --------

export const createDesktopScreen = (
  socket: Socket,
  desktopId: string,
): Signaling<void, TransportParams> => {
  return () => sendRequest(socket, "createDesktopScreen", desktopId);
};

export const connectDesktopScreen = (
  socket: Socket,
  desktopId: string,
): Signaling<mediasoupClient.types.DtlsParameters, boolean> => {
  return (dtlsParameters: mediasoupClient.types.DtlsParameters) =>
    sendRequest(socket, "connectDesktopScreen", {
      desktopId: desktopId,
      dtlsParameters: dtlsParameters,
    });
};

export const establishDesktopScreen = (
  socket: Socket,
  desktopId: string,
): Signaling<ProduceDataParam, string | undefined> => {
  return (params: ProduceDataParam) =>
    sendRequest(socket, "establishDesktopScreen", {
      desktopId: desktopId,
      produceParameters: params,
    });
};

// -------- DesktopAUdio ---------

export const establishDesktopAudio = async (
  socket: Socket,
  desktopId: string,
): Promise<AudioResponse | undefined> => {
  return await sendRequest(socket, "establishDesktopAudio", desktopId);
};
