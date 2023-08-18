import { FileMsgType } from "./index";
import { WriteStream } from "fs";

export type ControlData = {
  move?: {
    x: number | undefined;
    y: number | undefined;
  };
  button?: {
    buttonMask: number | undefined;
    down: boolean | undefined;
  };
  key?: {
    keySim: number | undefined;
    down: boolean | undefined;
  };
};

export type AudioData = {
  rtp: number;
  rtcp?: number | undefined;
  ip_addr: string;
  srtpParameters?: SrtpParameters | undefined;
};

/**
 * SRTP parameters by mediasoup
 */
type SrtpParameters = {
  /**
   * Encryption and authentication transforms to be used.
   */
  cryptoSuite: SrtpCryptoSuite;
  /**
   * SRTP keying material (master key and salt) in Base64.
   */
  keyBase64: string;
};
/**
 * SRTP crypto suite.
 */
type SrtpCryptoSuite =
  | "AEAD_AES_256_GCM"
  | "AEAD_AES_128_GCM"
  | "AES_CM_128_HMAC_SHA1_80"
  | "AES_CM_128_HMAC_SHA1_32";
//# sourceMappingURL=SrtpParameters.d.ts.map

export type FileWatchMsg = {
  msgType: FileMsgType;
  msgItems: string[];
};

export type WriteFileInfo = {
  stream: WriteStream;
  size: number;
  receivedSize: number;
};
