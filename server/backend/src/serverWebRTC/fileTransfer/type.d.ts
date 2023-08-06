import {
    IceParameters,
    IceCandidate,
    DtlsParameters,
    SctpParameters,
    SctpStreamParameters
} from 'mediasoup/node/lib/types';

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
    sctpStreamParameters: SctpStreamParameters|undefined;
    label: string;
    protocol: string;
};

export type ProduceDataParams = { 
    id: string;
    sctpStreamParameters: SctpStreamParameters|undefined;
    label: string|undefined;
    protocol: string|undefined;
    // appData: any 
};
