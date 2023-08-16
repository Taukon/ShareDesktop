import { IpcRendererEvent, contextBridge, ipcRenderer } from "electron";
import { AudioData, FileWatchMsg } from "../util/type";

export const controlObject = {
  testControl: async (displayName: string, data: any) : Promise<void> => {
    await ipcRenderer.invoke('testControl', displayName, data);
  },
  getScreenshot: async (displayName: string): Promise<Buffer|undefined> => {
    const jpegImg: Buffer|undefined = await ipcRenderer.invoke('getScreenshot', displayName);
    return jpegImg;
  },
  getFullScreenshot: async (displayName: string): Promise<Buffer|undefined> => {
    const jpegImg: Buffer|undefined = await ipcRenderer.invoke('getFullScreenshot', displayName);
    return jpegImg;
  },
  startApp: async (displayNum: number): Promise<boolean> => {
    const result = await ipcRenderer.invoke('startApp', displayNum);
    return result;
  },
  getAddress: async (): Promise<string> => {
    const ipAddr: string = await ipcRenderer.invoke('getAddress');
    return ipAddr;
  },
  getAudio: async (pulseAudioDevice: number, data: AudioData): Promise<number|undefined> => {
    const ffmpegPid: number|undefined = await ipcRenderer.invoke('getAudio', pulseAudioDevice, data);
    return ffmpegPid;
  },
  stopAudio: async (ffmpegPid: number): Promise<void> => {
    await ipcRenderer.invoke('stopAudio', ffmpegPid);
  },
  getFileInfo: async (
      fileName: string
    ): Promise<{
      fileName: string,
      fileSize: number
    }|undefined> => {
    const result = await ipcRenderer.invoke('getFileInfo', fileName);
    return result;
  },
  setFileInfo: async(
    fileName: string,
    fileSize: number
  ): Promise<boolean> => {
    const result: boolean = await ipcRenderer.invoke('setFileInfo', fileName, fileSize);
    return result;
  },
  sendFileBuffer: async (fileName: string, fileTransferId: string): Promise<boolean> => {
    const result: boolean = await ipcRenderer.invoke('sendFileBuffer', fileName, fileTransferId);
    return result;
  },
  recvFileBuffer: async (fileName: string, buffer: Uint8Array): Promise<number> => {
    const result: number = await ipcRenderer.invoke('recvFileBuffer', fileName, buffer);
    return result;
  },
  destroyRecvFileBuffer: async (fileName: string): Promise<boolean> => {
    const result: boolean = await ipcRenderer.invoke('destroyRecvFileBuffer', fileName);
    return result;
  },
  initFileWatch: async (dir: string): Promise<boolean> => {
    const result: boolean = await ipcRenderer.invoke('initFileWatch', dir);
    return result;
  },
  sendFileWatch: async (dir: string): Promise<boolean> => {
    const result: boolean = await ipcRenderer.invoke('sendFileWatch', dir);
    return result;
  },
  // main -> renderer
  streamSendFileBuffer: (listener: (data: {fileTransferId: string, buf: Buffer}) => void) => {
    ipcRenderer.on(
      'streamSendFileBuffer',
      (event: IpcRendererEvent, {fileTransferId: string, buf: Buffer}) => listener({fileTransferId: string, buf: Buffer}),
    );
  },
  streamFileWatchMsg: (listener: (data: FileWatchMsg) => void) => {
    ipcRenderer.on(
      'streamFileWatchMessage',
      (event: IpcRendererEvent, data: FileWatchMsg) => listener(data),
    );
  },
}

contextBridge.exposeInMainWorld('api', controlObject);
