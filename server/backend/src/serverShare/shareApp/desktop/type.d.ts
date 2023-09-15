import { SrtpParameters } from "mediasoup/node/lib/types";

export type AudioResponse = {
  rtp: number;
  rtcp?: number;
  ip_addr: string;
  srtpParameters?: SrtpParameters;
};
