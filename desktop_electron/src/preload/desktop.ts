import { ipcRenderer } from "electron";
import { AudioData, ControlData, DisplayInfo } from "../util/type";

export const desktop = {
  getDisplayInfo: async (): Promise<DisplayInfo[]> => {
    return await ipcRenderer.invoke("getDisplayInfo");
  },
  testControl: async (
    displayName: string,
    data: ControlData,
  ): Promise<void> => {
    await ipcRenderer.invoke("testControl", displayName, data);
  },
  getScreenshot: async (displayName: string): Promise<Buffer | undefined> => {
    const jpegImg: Buffer | undefined = await ipcRenderer.invoke(
      "getScreenshot",
      displayName,
    );
    return jpegImg;
  },
  getFullScreenshot: async (
    displayName: string,
  ): Promise<Buffer | undefined> => {
    const jpegImg: Buffer | undefined = await ipcRenderer.invoke(
      "getFullScreenshot",
      displayName,
    );
    return jpegImg;
  },
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
  startApp: async (
    displayNum: number,
    appPath: string,
    width?: number,
    height?: number,
  ): Promise<boolean> => {
    const result = await ipcRenderer.invoke(
      "startApp",
      displayNum,
      appPath,
      width,
      height,
    );
    return result;
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
};
