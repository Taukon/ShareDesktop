import {
    WebRtcTransport,
    DirectTransport,
    PlainTransport,
    IceParameters,
    IceCandidate,
    DtlsParameters,
    SctpParameters,
    SrtpParameters,
    DataConsumer,
    DataProducer,
    Producer,
    Consumer,
    Worker,
    Router
} from 'mediasoup/node/lib/types';
import * as mediasoupClientType from "mediasoup-client/lib/types";

export type StartWorkerResponse = {
    worker: Worker;
    router: Router;
};

export type CreateRtcTransportResponse = {
    transport: WebRtcTransport,
    params: {
        id: string;
        iceParameters?: IceParameters;
        iceCandidates?: IceCandidate[];
        dtlsParameters?: DtlsParameters;
        sctpParameters?: SctpParameters;
    }
};
