import * as mediasoupClient from "mediasoup-client";
import { Chrome111 } from "mediasoup-client/lib/handlers/Chrome111.js";
import { ConsumeDataParams, ProduceDataParam, TransportParams } from "./type";
import { Signaling } from "../signaling/type";

export const loadDevice = async (
  forDevice: Signaling<void, mediasoupClient.types.RtpCapabilities>,
): Promise<mediasoupClient.types.Device> => {
  const rtpCap = await forDevice();
  const device = new mediasoupClient.Device({
    handlerFactory: Chrome111.createFactory(),
  });
  await device.load({ routerRtpCapabilities: rtpCap });
  return device;
};

export const setDataProducer = async (
  device: mediasoupClient.types.Device,
  forTransport: Signaling<void, TransportParams | undefined>,
  forConnect: Signaling<mediasoupClient.types.DtlsParameters, void>,
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
  forConnect: Signaling<mediasoupClient.types.DtlsParameters, void>,
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
