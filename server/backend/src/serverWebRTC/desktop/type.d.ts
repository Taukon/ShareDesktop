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

export type DataConsumerParams = {
    id: string;
    dataProducerId: string;
    sctpStreamParameters: SctpStreamParameters | undefined;
    label: string;
    protocol: string;
};

export type AudioResponse = { 
    rtp: number, 
    rtcp?: number, 
    ip_addr: string, 
    srtpParameters?: SrtpParameters
};
