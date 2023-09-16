import {
  type RtpCodecCapability,
  type WebRtcTransportOptions,
  type WorkerSettings,
} from "mediasoup/node/lib/types";
import { startWorker } from "./common";
import { ShareApp } from "./shareApp";
import { ShareFile } from "./shareFile";

export const initServerShare = async (
  limitAppDtp: number,
  limitAppBro: number,
  limitFileDtp: number,
  limitFileBro: number,
  limitFileTrf: number,
  transportOptions: WebRtcTransportOptions,
  workerSettings: WorkerSettings,
  mediaCodecs: RtpCodecCapability[],
  ipAddr: string,
): Promise<{
  shareApp: ShareApp;
  shareFile: ShareFile;
}> => {
  const router = (await startWorker(workerSettings, mediaCodecs)).router;
  const shareApp = new ShareApp(
    limitAppDtp,
    limitAppBro,
    router,
    transportOptions,
    ipAddr,
  );
  const shareFile = new ShareFile(
    limitFileDtp,
    limitFileBro,
    limitFileTrf,
    router,
    transportOptions,
  );

  return { shareApp, shareFile };
};
