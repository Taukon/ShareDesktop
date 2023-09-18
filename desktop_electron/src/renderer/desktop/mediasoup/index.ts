import * as mediasoupClient from "mediasoup-client";
import { Chrome111 } from "mediasoup-client/lib/handlers/Chrome111.js";
import {
  ConsumeDataParams,
  ProduceDataParam,
  ProduceParam,
  TransportParams,
} from "./type";
import { Signaling } from "../signaling/type";

export const loadDevice = async (
  forDevice: Signaling<void, mediasoupClient.types.RtpCapabilities | undefined>,
): Promise<mediasoupClient.types.Device | undefined> => {
  const rtpCap = await forDevice();
  const device = new mediasoupClient.Device({
    handlerFactory: Chrome111.createFactory(),
  });
  if (rtpCap) {
    await device.load({ routerRtpCapabilities: rtpCap });
    return device;
  }
  return undefined;
};

export const setProducer = async (
  device: mediasoupClient.types.Device,
  forTransport: Signaling<void, TransportParams | undefined>,
  forConnect: Signaling<mediasoupClient.types.DtlsParameters, boolean>,
  forProduce: Signaling<ProduceParam, string | undefined>,
  track: MediaStreamTrack,
): Promise<mediasoupClient.types.Producer | undefined> => {
  const transportParams = await forTransport();
  if (!transportParams) return undefined;
  const transport = device.createSendTransport(transportParams);

  transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
    forConnect(dtlsParameters).then(callback).catch(errback);
  });

  transport.on("produce", async (parameters, callback, errback) => {
    try {
      const id = await forProduce(parameters);
      if (id) callback({ id: id });
    } catch (err: any) {
      errback(err);
    }
  });

  transport.observer.on("close", () => {
    transport.close();
  });

  const producer = await transport.produce({ track: track });

  return producer;
};

export const setDataProducer = async (
  device: mediasoupClient.types.Device,
  forTransport: Signaling<void, TransportParams | undefined>,
  forConnect: Signaling<mediasoupClient.types.DtlsParameters, boolean>,
  forProducedata: Signaling<ProduceDataParam, string | undefined>,
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
      const id = await forProducedata(parameters);
      if (id) callback({ id: id });
    } catch (err: any) {
      errback(err);
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
