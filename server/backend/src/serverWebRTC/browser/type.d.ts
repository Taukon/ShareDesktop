import {
    IceParameters,
    IceCandidate,
    DtlsParameters,
    SctpParameters,
    MediaKind,
    RtpParameters
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
    id: string;
    producerId: string;
    kind: MediaKind;
    rtpParameters: RtpParameters;
}