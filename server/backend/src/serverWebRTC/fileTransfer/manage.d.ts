import {
    WebRtcTransport,
    DirectTransport,
    DataConsumer,
    Producer,
    Consumer
} from 'mediasoup/node/lib/types';

export type SendFileTransport = WebRtcTransport & { producer?: DataProducer };
export type RecvFileTransport = WebRtcTransport & { consumer?: DataConsumer };

export type FileTransports = {
    SendTransport?: SendFileTransport;
    RecvTransport?: RecvFileTransport;
    exits: boolean;
};

export type FileTransferList = {
    [transferId: string]: FileTransports;
};