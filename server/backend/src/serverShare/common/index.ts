import { createWorker } from "mediasoup";
import {
  DataConsumer,
  DataProducer,
  DirectTransport,
  PlainTransport,
  Producer,
  Router,
  RtpCodecCapability,
  WebRtcTransportOptions,
  WorkerSettings,
} from "mediasoup/node/lib/types";
import { CreateRtcTransportResponse, StartWorkerResponse } from "./type";

export const startWorker = async (
  workerSettings: WorkerSettings,
  mediaCodecs: RtpCodecCapability[] | undefined,
): Promise<StartWorkerResponse> => {
  const worker = await createWorker(workerSettings);
  const router = await worker.createRouter({ mediaCodecs });

  return { worker: worker, router: router };
};

export const createRtcTransport = async (
  router: Router,
  transportOption: WebRtcTransportOptions,
): Promise<CreateRtcTransportResponse> => {
  const transport = await router.createWebRtcTransport(transportOption);
  return {
    transport: transport,
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      sctpParameters: transport.sctpParameters,
    },
  };
};

// --- Producer PlainTransport ---
// --- send audio
export const createPlainProducer = async (
  router: Router,
  ipAddr: string,
  rtcpMux: boolean,
): Promise<PlainTransport & { producer?: Producer }> => {
  const transport: PlainTransport & { producer?: Producer } =
    await router.createPlainTransport({
      listenIp: ipAddr,
      rtcpMux: rtcpMux,
      //rtcpMux: false,
      comedia: true, // for answerer
      enableSrtp: true,
      srtpCryptoSuite: "AES_CM_128_HMAC_SHA1_80",
    });

  // Read the transport local RTP port.
  const audioRtpPort = transport.tuple.localPort;
  console.log("audioRtpPort: " + audioRtpPort);
  console.log(`tuple: ${JSON.stringify(transport.tuple)}`);

  // If rtcpMux is false, read the transport local RTCP port.
  const audioRtcpPort = transport.rtcpTuple?.localPort;
  console.log("audioRtcpPort: " + audioRtcpPort);

  // If enableSrtp is true, read the transport srtpParameters.
  const srtpParameters = transport.srtpParameters;
  console.log(`srtpParameters: ${JSON.stringify(srtpParameters)}`);

  // If comedia is enabled and SRTP is also enabled, connect() must be called with just the remote srtpParameters.
  if (srtpParameters) {
    await transport.connect({
      srtpParameters: srtpParameters,
    });
  }

  const audioProducer = await transport.produce({
    kind: "audio",
    rtpParameters: {
      codecs: [
        {
          mimeType: "audio/opus",
          clockRate: 48000,
          payloadType: 101,
          channels: 2,
          rtcpFeedback: [],
          parameters: { sprop_stereo: 1 },
        },
      ],
      encodings: [{ ssrc: 11111111 }],
    },
  });

  transport.producer = audioProducer;

  return transport;
};

// // --- Producer DirectTransport ---
export const createDirectProducer = async (
  router: Router,
): Promise<DirectTransport & { producer?: DataProducer }> => {
  const transport: DirectTransport & { producer?: DataProducer } =
    await router.createDirectTransport();

  const dataProducer = await transport.produceData();
  transport.producer = dataProducer;

  console.log("directDataTransport produce id: " + dataProducer.id);

  return transport;
};

// --- Consumer DirectTransport
export const createDirectConsumer = async (
  router: Router,
  dataProducerId: string,
): Promise<DirectTransport & { consumer?: DataConsumer }> => {
  //console.log("createDirectConsumer");
  const transport: DirectTransport & { consumer?: DataConsumer } =
    await router.createDirectTransport();

  const dataConsumer = await transport.consumeData({
    dataProducerId: dataProducerId,
  });
  transport.consumer = dataConsumer;

  return transport;
};
