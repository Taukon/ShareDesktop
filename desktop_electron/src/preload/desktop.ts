import { ipcRenderer } from "electron";
import { AudioData, ControlData, DisplayInfo } from "../util/type";

export const desktop = {
  getDisplayInfo: async (): Promise<DisplayInfo[]> => {
    return await ipcRenderer.invoke("getDisplayInfo");
  },
  control: async (displayName: string, data: ControlData): Promise<void> => {
    await ipcRenderer.invoke("control", displayName, data);
  },
  controlWID: async (
    displayName: string,
    windowId: number,
    data: ControlData,
  ): Promise<void> => {
    await ipcRenderer.invoke("controlWID", displayName, windowId, data);
  },
  getAudio: async (
    pulseAudioDevice: number,
    data: AudioData,
  ): Promise<number | undefined> => {
    const ffmpegPid: number | undefined = await ipcRenderer.invoke(
      "getAudio",
      pulseAudioDevice,
      data,
    );
    return ffmpegPid;
  },
  stopAudio: async (ffmpegPid: number): Promise<void> => {
    await ipcRenderer.invoke("stopAudio", ffmpegPid);
  },
  // Xvfb
  setXkbLayout: async (
    displayNum: number,
    layout: string,
  ): Promise<boolean> => {
    const result = await ipcRenderer.invoke("setXkbLayout", displayNum, layout);
    return result;
  },
  setInputMethod: async (displayNum: number): Promise<boolean> => {
    const result = await ipcRenderer.invoke("setInputMethod", displayNum);
    return result;
  },
  startXvfb: async (
    displayNum: number,
    width?: number,
    height?: number,
  ): Promise<boolean> => {
    const result = await ipcRenderer.invoke(
      "startXvfb",
      displayNum,
      width,
      height,
    );
    return result;
  },
  getX11Screenshot: async (
    displayName: string,
  ): Promise<Buffer | undefined> => {
    const jpegImg: Buffer | undefined = await ipcRenderer.invoke(
      "getX11Screenshot",
      displayName,
    );
    return jpegImg;
  },
  getX11FullScreenshot: async (
    displayName: string,
  ): Promise<Buffer | undefined> => {
    const jpegImg: Buffer | undefined = await ipcRenderer.invoke(
      "getX11FullScreenshot",
      displayName,
    );
    return jpegImg;
  },
  startX11App: async (
    displayNum: number,
    appPath: string,
  ): Promise<boolean> => {
    const result = await ipcRenderer.invoke("startX11App", displayNum, appPath);
    return result;
  },
  getXDisplayEnv: async (): Promise<string> => {
    const path: string = await ipcRenderer.invoke("getXDisplayEnv");
    return path;
  },
};
