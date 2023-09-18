import {
  WebRtcTransport,
  IceParameters,
  IceCandidate,
  DtlsParameters,
  SctpParameters,
  Worker,
  Router,
  RtpParameters,
  MediaKind,
} from "mediasoup/node/lib/types";

export type StartWorkerResponse = {
  worker: Worker;
  router: Router;
};

export type CreateRtcTransportResponse = {
  transport: WebRtcTransport;
  params: RtcTransportParams;
};

export type RtcTransportParams = {
  id: string;
  iceParameters?: IceParameters | undefined;
  iceCandidates?: IceCandidate[] | undefined;
  dtlsParameters?: DtlsParameters | undefined;
  sctpParameters?: SctpParameters | undefined;
};

export type ConsumeDataParams = {
  id: string;
  dataProducerId: string;
  sctpStreamParameters: SctpStreamParameters | undefined;
  label: string;
  protocol: string;
};

export type ProducerParams = {
  id?: string;
  kind: MediaKind; //'audio' | 'video';
  rtpParameters: RtpParameters;
  paused?: boolean;
  keyFrameRequestDelay?: number;
  // appData?: any;
};

export type ProduceDataParams = {
  id: string;
  sctpStreamParameters: SctpStreamParameters | undefined;
  label: string | undefined;
  protocol: string | undefined;
  // appData: any
};
