import { ipcRenderer } from "electron";
import { AudioData, ControlData } from "../util/type";

export const desktop = {
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
  startApp: async (displayNum: number): Promise<boolean> => {
    const result = await ipcRenderer.invoke("startApp", displayNum);
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
