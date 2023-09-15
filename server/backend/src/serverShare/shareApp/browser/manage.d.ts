import {
  WebRtcTransport,
  DirectTransport,
  DataConsumer,
  DataProducer,
  Consumer,
} from "mediasoup/node/lib/types";

export type ScreenBrowserTransport = WebRtcTransport & {
  consumer?: DataConsumer;
};
export type AudioBrowserTransport = WebRtcTransport & { consumer?: Consumer };
export type ControlBrowserDirTransport = DirectTransport & {
  consumer?: DataConsumer;
};
export type ControlBrowserRtcTransport = WebRtcTransport & {
  producer?: DataProducer;
};

export type BrowserTransports = {
  controlRtcTransport?: ControlBrowserRtcTransport;
  controlDirTransport?: ControlBrowserDirTransport;
  screenTransport?: ScreenBrowserTransport;
  audioTransport?: AudioBrowserTransport;
  createTime: string;
};

export type BrowserAppList = {
  [desktopId: string]: BrowserTransports;
  createTime: string;
};

/**
 *  key: browserId (Websocket Id),
 *  value: { [key: desktopId,
 *           value: {
 *                      controlSendTransport,
 *                      controlRecvTransport,
 *                      screenTransport,
 *                      audioTransport,
 *                      createTime
 *                  }
 *            ],
 *            createTime
 *          }
 */
export type BrowserList = {
  [browserId: string]: BrowserAppList;
};
