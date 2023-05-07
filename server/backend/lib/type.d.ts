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

export type ScreenRecvTransport = WebRtcTransport & { consumer?: DataConsumer };
export type AudioRecvTransport = WebRtcTransport & { consumer?: Consumer };
export type ControlRecvTransport =DirectTransport & { consumer?: DataConsumer };

export type ScreenSendTransport = DirectTransport & { producer?: DataProducer };
export type AudioSendTransport = PlainTransport & { producer?: Producer };
export type ControlSendTransport = WebRtcTransport & { producer?: Producer };

export type ClientTransports = {
    controlSendTransport?: ControlSendTransport;
    controlRecvTransport?: ControlRecvTransport;
    screenTransport?: ScreenRecvTransport;
    audioTransport?: AudioRecvTransport;
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
    screenTransport: ScreenSendTransport;
    audioTransport?: AudioSendTransport;
};

/**
 * key: desktopId (channel id), 
 * value: {
 *  channel,
 *  screenSendTransport, 
 *  audioSendtransport
 * }
 */
export type DesktopList = {
    [desktopId: string]: DesktopTransports & {channel: ServerChannel};
}


export type StartWorkerResponse = {
    worker: Worker;
    router: Router;
}

export type CreateMediaWebRtcTransportResponse = {
    transport: WebRtcTransport,
    params: {
        id: string;
        iceParameters?: IceParameters;
        iceCandidates?: IceCandidate[];
        dtlsParameters?: DtlsParameters;
        sctpParameters?: SctpParameters;
    }
}

export type createTransportResponse = {
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

export type consumeScreenResponse = {
    id: string;
    dataProducerId: string;
    sctpStreamParameters: SctpStreamParameters | undefined;
    label: string;
    protocol: string;
}

export type consumeAudioResponse = {
    id: string;
    producerId: string;
    kind: MediaKind;
    rtpParameters: RtpParameters;
}