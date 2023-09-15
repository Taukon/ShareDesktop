import {
  WebRtcTransport,
  DataConsumer,
  DataProducer,
} from "mediasoup/node/lib/types";

export type SendFileTransport = WebRtcTransport & { producer?: DataProducer };
export type RecvFileTransport = WebRtcTransport & { consumer?: DataConsumer };

export type FileTransports = {
  SendTransport?: SendFileTransport;
  RecvTransport?: RecvFileTransport;
};

export type Transfer = {
  desktop: FileTransports;
  browser: FileTransports;
  createTime: string;
};

export type FileTransferList = {
  [transferId: string]: Transfer;
};
