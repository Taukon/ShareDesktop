import { Socket } from 'socket.io-client';
import { ServerChannel } from '@geckos.io/server';
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


/**
 * Client User Side:
 * User = clientMediaId -> [desktopId_1, desktopId_2, ...]
 * 
 * Client Desktop Side:
 * Desktop = desktopId
 */

export type ScreenClientTransport = WebRtcTransport & { consumer?: DataConsumer };
export type AudioClientTransport = WebRtcTransport & { consumer?: Consumer };
export type ControlDesktopRtcTransport = WebRtcTransport & { consumer?: DataConsumer };
export type ControlClientDirTransport = DirectTransport & { consumer?: DataConsumer };

export type ScreenDesktopTransport = WebRtcTransport & { producer?: DataProducer };
export type AudioDesktopTransport = PlainTransport & { producer?: Producer };
export type ControlClientRtcTransport = WebRtcTransport & { producer?: Producer };
export type ControlDesktopDirTransport = DirectTransport & { producer?: DataProducer };

export type ClientTransports = {
    controlRtcTransport?: ControlClientRtcTransport;
    controlDirTransport?: ControlClientDirTransport;
    screenTransport?: ScreenClientTransport;
    audioTransport?: AudioClientTransport;
    exits: boolean;
};

export type MediaClient = {
    [desktopId: string]: ClientTransports;
    exits: boolean;
}

/**
 *  key: mediaClientId (Websocket Id), 
 *  value: { [key: desktopId,
 *           value: {
 *                      controlSendTransport,
 *                      controlRecvTransport,
 *                      screenTransport,
 *                      audioTransport,
 *                      exits
 *                  }
 *              ],
 *            exits
 *          }
 */
export type MediaClientList = {
    [mediaClientId: string]: MediaClient;
}

export type DesktopTransports  = {
    controlRtcTransport?: ControlDesktopRtcTransport;
    controlDirTransport?: ControlDesktopDirTransport;
    screenTransport?: ScreenDesktopTransport;
    audioTransport?: AudioDesktopTransport;
    exits: boolean;
};

/**
 * key: desktopId (channel id), 
 * value: {
 *  screenSendTransport, 
 *  audioSendtransport,
 *  exits
 * }
 */
export type DesktopList = {
    [desktopId: string]: DesktopTransports;
}


export type StartWorkerResponse = {
    worker: Worker;
    router: Router;
}

export type CreateRtcTransportResponse = {
    transport: WebRtcTransport,
    params: {
        id: string;
        iceParameters?: IceParameters;
        iceCandidates?: IceCandidate[];
        dtlsParameters?: DtlsParameters;
        sctpParameters?: SctpParameters;
    }
}

export type CreateTransportResponse = {
    id: string;
    iceParameters?: IceParameters | undefined;
    iceCandidates?: IceCandidate[] | undefined;
    dtlsParameters?: DtlsParameters | undefined;
    sctpParameters?: SctpParameters | undefined;
};

//-----------------------------------------------------------------

type TransportProduceDataParameters = {
    sctpStreamParameters: mediasoupClientType.SctpStreamParameters;
    label: string;
    protocol: string;
    appData: any;
}

export type ConsumeDataResponse = {
    id: string;
    dataProducerId: string;
    sctpStreamParameters: SctpStreamParameters | undefined;
    label: string;
    protocol: string;
}

export type ConsumeAudioResponse = {
    id: string;
    producerId: string;
    kind: MediaKind;
    rtpParameters: RtpParameters;
}

export type AudioResponse = { 
    rtp: number, 
    rtcp?: number, 
    ip_addr: string, 
    srtpParameters?: SrtpParameters
}