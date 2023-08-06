import * as mediasoupClient from "mediasoup-client";

export type TransportParams = { 
    id: string; 
    iceParameters: mediasoupClient.types.IceParameters;
    iceCandidates: mediasoupClient.types.IceCandidate[];
    dtlsParameters: mediasoupClient.types.DtlsParameters;
    sctpParameters: mediasoupClient.types.SctpParameters|undefined;
    iceServers: mediasoupClient.types.RTCIceServer[]|undefined
    iceTransportPolicy: mediasoupClient.types.RTCIceTransportPolicy|undefined;
    additionalSettings: any;
    proprietaryConstraints: any;
    // appData: any;
};

export type ProduceDataParam = {
    sctpStreamParameters: mediasoupClient.types.SctpStreamParameters;
    label?: string|undefined;
    protocol?: string|undefined;
    appData: mediasoupClient.types.AppData;
};

export type ConsumeDataParams = { 
    id: string|undefined;
    dataProducerId: string|undefined
    sctpStreamParameters: mediasoupClient.types.SctpStreamParameters;
    label: string|undefined;
    protocol: string|undefined;
    // appData: any;
};

export type ConsumeParams = { 
    id: string|undefined;
    producerId: string|undefined;
    kind: "audio"|"video"|undefined; 
    rtpParameters: mediasoupClient.types.RtpParameters; 
    streamId: string|undefined;
    // appData: any;
}
