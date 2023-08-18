export type Callback<T> = (res: T) => void;

export interface FileInfo {
  fileTransferId: string;
  fileName: string;
  fileSize: number;
}
