import { MediaKind, RtpParameters } from "mediasoup/node/lib/types";

export type AudioResponse = {
  id: string;
  producerId: string;
  kind: MediaKind;
  rtpParameters: RtpParameters;
};
