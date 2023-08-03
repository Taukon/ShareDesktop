import {
    WebRtcTransport,
    DirectTransport,
    PlainTransport,
    DataConsumer,
    DataProducer,
    Producer,
} from 'mediasoup/node/lib/types';

export type ScreenDesktopTransport = WebRtcTransport & { producer?: DataProducer };
export type AudioDesktopTransport = PlainTransport & { producer?: Producer };
export type ControlDesktopDirTransport = DirectTransport & { producer?: DataProducer };
export type ControlDesktopRtcTransport = WebRtcTransport & { consumer?: DataConsumer };

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
