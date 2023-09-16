import * as mediasoupClient from "mediasoup-client";
import {
  ConsumeDataParams,
  ConsumeParams,
  ProduceDataParam,
  TransportParams,
} from "./type";
import { Signaling } from "../signaling/type";

export const loadDevice = async (
  forDevice: Signaling<void, mediasoupClient.types.RtpCapabilities | undefined>,
): Promise<mediasoupClient.types.Device | undefined> => {
  const rtpCap = await forDevice();
  const device = new mediasoupClient.Device();
  if (!rtpCap) return undefined;
  await device.load({ routerRtpCapabilities: rtpCap });
  return device;
};

export const setDataProducer = async (
  device: mediasoupClient.types.Device,
  forTransport: Signaling<void, TransportParams | undefined>,
  forConnect: Signaling<mediasoupClient.types.DtlsParameters, boolean>,
  forProduceData: Signaling<ProduceDataParam, string | undefined>,
  options?: { ordered: boolean; maxRetransmits: number },
): Promise<mediasoupClient.types.DataProducer | undefined> => {
  const transportParams = await forTransport();
  if (!transportParams) return undefined;
  const transport = device.createSendTransport(transportParams);

  transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
    forConnect(dtlsParameters).then(callback).catch(errback);
  });

  transport.on("producedata", async (parameters, callback, errback) => {
    try {
      const id = await forProduceData(parameters);
      if (id) callback({ id: id });
    } catch (error: any) {
      errback(error);
    }
  });

  transport.observer.on("close", () => {
    transport.close();
  });

  if (options) {
    const producer = await transport.produceData({
      ordered: options.ordered,
      maxRetransmits: options.maxRetransmits,
    });
    return producer;
  } else {
    const producer = await transport.produceData({ ordered: true });
    return producer;
  }
};

export const setDataConsumer = async (
  device: mediasoupClient.types.Device,
  forTransport: Signaling<void, TransportParams | undefined>,
  forConnect: Signaling<mediasoupClient.types.DtlsParameters, boolean>,
  forConsumeData: Signaling<void, ConsumeDataParams | undefined>,
): Promise<mediasoupClient.types.DataConsumer | undefined> => {
  const transportParams = await forTransport();
  if (!transportParams) return undefined;
  const transport = device.createRecvTransport(transportParams);

  transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
    forConnect(dtlsParameters).then(callback).catch(errback);
  });

  transport.observer.on("close", () => {
    transport.close();
  });

  const consumerParams = await forConsumeData();
  if (consumerParams) {
    const consumer = await transport.consumeData(consumerParams);
    return consumer;
  }
  return undefined;
};

export const setConsumer = async (
  device: mediasoupClient.types.Device,
  forTransport: Signaling<void, TransportParams | undefined>,
  forConnect: Signaling<mediasoupClient.types.DtlsParameters, void>,
  forConsume: Signaling<void, ConsumeParams | undefined>,
): Promise<mediasoupClient.types.Consumer | undefined> => {
  const transportParams = await forTransport();
  if (!transportParams) return undefined;
  const transport = device.createRecvTransport(transportParams);

  transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
    forConnect(dtlsParameters).then(callback).catch(errback);
  });

  transport.observer.on("close", () => {
    transport.close();
  });

  const consumerParams = await forConsume();
  if (consumerParams) {
    const consumer = await transport.consume(consumerParams);
    return consumer;
  }

  return undefined;
};
