import { DataProducer } from "mediasoup-client/lib/types";

export type FileInfo = {
  fileTransferId: string;
  fileName: string;
  fileSize: number;
};

export type FileProducerInfo = {
  producer: DataProducer;
  fileName: string;
  type: string; // write | read
};

export type WriteInfo = {
  fileName: string;
  fileSize: number;
  fileReader: ReadableStreamDefaultReader<Uint8Array>;
};

export type WriteInfoList = {
  [id: string]: WriteInfo;
};

export type FileProducerList = {
  [id: string]: FileProducerInfo;
};
export type WriteFile = {
  fileName: string;
  fileSize: number;
};

export type ReadFile = {
  fileName: string;
};
