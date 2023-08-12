import { IpcRendererEvent, contextBridge, ipcRenderer } from "electron";
import { AudioData } from "../util/type";

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
  getFileBuffer: async (fileName: string, fileTransferId: string): Promise<boolean> => {
    const result: boolean = await ipcRenderer.invoke('getFileBuffer', fileName, fileTransferId);
    return result;
  },
  // main -> renderer
  streamSendFileBuffer: (listener: (data: {fileTransferId: string, buf: Buffer}) => void) => {
    ipcRenderer.on(
      'streamSendFileBuffer',
      (event: IpcRendererEvent, {fileTransferId: string, buf: Buffer}) => listener({fileTransferId: string, buf: Buffer}),
    );
    // return () => {
    //   ipcRenderer.removeAllListeners('streamSendFileBuffer');
    // };
  },
}

contextBridge.exposeInMainWorld('api', controlObject);
