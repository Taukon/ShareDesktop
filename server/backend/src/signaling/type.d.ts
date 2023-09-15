export type Callback<T> = (res: T) => void;

export interface FileInfo {
  fileTransferId: string;
  fileName: string;
  fileSize: number;
}

export type Access = {
  desktopId: string;
  token: string;
};

type AuthInfo = {
  desktopId: string;
  password: string;
  browserId: string;
};

export type ClientInfo = {
  desktopId: string;
  password: string;
};
