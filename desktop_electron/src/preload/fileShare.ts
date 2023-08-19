import { IpcRendererEvent, ipcRenderer } from "electron";
import { FileWatchMsg } from "../util/type";

export const fileShare = {
  getFileInfo: async (
    fileName: string,
  ): Promise<
    | {
        fileName: string;
        fileSize: number;
      }
    | undefined
  > => {
    const result = await ipcRenderer.invoke("getFileInfo", fileName);
    return result;
  },
  setFileInfo: async (fileName: string, fileSize: number): Promise<boolean> => {
    const result: boolean = await ipcRenderer.invoke(
      "setFileInfo",
      fileName,
      fileSize,
    );
    return result;
  },
  sendFileBuffer: async (
    fileName: string,
    fileTransferId: string,
  ): Promise<boolean> => {
    const result: boolean = await ipcRenderer.invoke(
      "sendFileBuffer",
      fileName,
      fileTransferId,
    );
    return result;
  },
  recvFileBuffer: async (
    fileName: string,
    buffer: Uint8Array,
  ): Promise<number> => {
    const result: number = await ipcRenderer.invoke(
      "recvFileBuffer",
      fileName,
      buffer,
    );
    return result;
  },
  destroyRecvFileBuffer: async (fileName: string): Promise<boolean> => {
    const result: boolean = await ipcRenderer.invoke(
      "destroyRecvFileBuffer",
      fileName,
    );
    return result;
  },
  initFileWatch: async (dir: string): Promise<boolean> => {
    const result: boolean = await ipcRenderer.invoke("initFileWatch", dir);
    return result;
  },
  sendFileWatch: async (dir: string): Promise<boolean> => {
    const result: boolean = await ipcRenderer.invoke("sendFileWatch", dir);
    return result;
  },
  // main -> renderer
  streamSendFileBuffer: (
    listener: (data: { fileTransferId: string; buf: Buffer }) => void,
  ) => {
    ipcRenderer.on(
      "streamSendFileBuffer",
      (event: IpcRendererEvent, { fileTransferId: string, buf: Buffer }) =>
        listener({ fileTransferId: string, buf: Buffer }),
    );
  },
  streamFileWatchMsg: (listener: (data: FileWatchMsg) => void) => {
    ipcRenderer.on(
      "streamFileWatchMessage",
      (event: IpcRendererEvent, data: FileWatchMsg) => listener(data),
    );
  },
};
