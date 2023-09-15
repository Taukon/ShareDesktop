import { WebRtcTransport, DataConsumer } from "mediasoup/node/lib/types";

export type FileWatchTransport = WebRtcTransport & { consumer?: DataConsumer };

export type BrowserTransports = {
  fileWatchTransport?: FileWatchTransport;
  createTime: string;
};

export type BrowserFileList = {
  [desktopId: string]: BrowserTransports;
  createTime: string;
};

/**
 *  key: browserId (Websocket Id),
 *  value: { [key: desktopId,
 *           value: {
 *                      fileWatchTransport
 *                      createTime
 *                  }
 *              ],
 *            createTime
 *          }
 */
export type BrowserList = {
  [browserId: string]: BrowserFileList;
};
