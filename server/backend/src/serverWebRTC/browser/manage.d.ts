import {
    WebRtcTransport,
    DirectTransport,
    DataConsumer,
    Producer,
    Consumer
} from 'mediasoup/node/lib/types';

export type ScreenBrowserTransport = WebRtcTransport & { consumer?: DataConsumer };
export type AudioBrowserTransport = WebRtcTransport & { consumer?: Consumer };
export type ControlBrowserDirTransport = DirectTransport & { consumer?: DataConsumer };
export type ControlBrowserRtcTransport = WebRtcTransport & { producer?: Producer };
export type FileWatchTransport = WebRtcTransport & { consumer?: DataConsumer };

export type BrowserTransports = {
    controlRtcTransport?: ControlBrowserRtcTransport;
    controlDirTransport?: ControlBrowserDirTransport;
    screenTransport?: ScreenBrowserTransport;
    audioTransport?: AudioBrowserTransport;
    fileWatchTransport?: FileWatchTransport;
    exits: boolean;
};

export type BrowserList = {
    [desktopId: string]: BrowserTransports;
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
export type BrowserClientList = {
    [browserId: string]: BrowserList;
}