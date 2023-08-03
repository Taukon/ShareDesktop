import * as mediasoupClient from "mediasoup-client";

export type RtcTransportParams = {
    id: string;
    iceParameters: mediasoupClient.types.IceParameters;
    iceCandidates: mediasoupClient.types.IceCandidate[];
    dtlsParameters: mediasoupClient.types.DtlsParameters;
    sctpParameters: mediasoupClient.types.SctpParameters;
};
