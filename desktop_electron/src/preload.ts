import { contextBridge, ipcRenderer } from "electron";

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
    const ipAddr = await ipcRenderer.invoke('getAddress');
    return ipAddr;
  },
}

contextBridge.exposeInMainWorld('api', controlObject);
