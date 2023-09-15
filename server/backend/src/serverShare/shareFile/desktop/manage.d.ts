import { WebRtcTransport, DataProducer } from "mediasoup/node/lib/types";

export type FileWatchTransport = WebRtcTransport & { producer?: DataProducer };

export type DesktopTransports = {
  fileWatchTransport?: FileWatchTransport;
  createTime: string;
};

/**
 * key: desktopId (channel id),
 * value: {
 *  fileWatchTransport
 *  createTime
 * }
 */
export type DesktopList = {
  [desktopId: string]: DesktopTransports;
};
