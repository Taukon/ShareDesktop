import * as mediasoupClient from "mediasoup-client";
import {
  ConsumeDataParams,
  ConsumeParams,
  ProduceDataParam,
  TransportParams,
} from "./type";
import { Signaling } from "../signaling/type";

export const loadDevice = async (
  forDevice: Signaling<void, mediasoupClient.types.RtpCapabilities>,
): Promise<mediasoupClient.types.Device> => {
  const rtpCap = await forDevice();
  const device = new mediasoupClient.Device();
  await device.load({ routerRtpCapabilities: rtpCap });
  return device;
};

export const createSendTransport = async (
  device: mediasoupClient.types.Device,
  forTransport: Signaling<void, TransportParams>,
): Promise<mediasoupClient.types.Transport> => {
  const params = await forTransport();
  const transport = device.createSendTransport(params);

  return transport;
};

export const sendEventEmitter = (
  transport: mediasoupClient.types.Transport,
  forConnect: Signaling<mediasoupClient.types.DtlsParameters, void>,
  forProducedata: Signaling<ProduceDataParam, string>,
): void => {
  transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
    forConnect(dtlsParameters).then(callback).catch(errback);
  });

  transport.on("producedata", async (parameters, callback, errback) => {
    try {
      const id = await forProducedata(parameters);
      callback({ id: id });
    } catch (error: any) {
      errback(error);
    }
  });

  transport.observer.on("close", () => {
    transport.close();
  });
};

export const createRecvTransport = async (
  device: mediasoupClient.types.Device,
  forTransport: Signaling<void, TransportParams>,
): Promise<mediasoupClient.types.Transport> => {
  const params = await forTransport();
  const transport = device.createRecvTransport(params);

  return transport;
};

export const recvEventEmitter = (
  transport: mediasoupClient.types.Transport,
  forConnect: Signaling<mediasoupClient.types.DtlsParameters, void>,
): void => {
  transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
    forConnect(dtlsParameters).then(callback).catch(errback);
  });

  transport.observer.on("close", () => {
    transport.close();
  });
};

export const getConsumeData = async (
  transport: mediasoupClient.types.Transport,
  forConsumeData: Signaling<void, ConsumeDataParams | undefined>,
): Promise<mediasoupClient.types.DataConsumer | undefined> => {
  const params = await forConsumeData();
  if (params) {
    const consumer = await transport.consumeData(params);
    return consumer;
  }
  return undefined;
};

export const getConsume = async (
  transport: mediasoupClient.types.Transport,
  forConsume: Signaling<void, ConsumeParams | undefined>,
): Promise<mediasoupClient.types.Consumer | undefined> => {
  const params = await forConsume();
  if (params) {
    const consumer = await transport.consume(params);
    return consumer;
  }
  return undefined;
};
