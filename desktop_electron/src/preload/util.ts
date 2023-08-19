import { ipcRenderer } from "electron";

export const util = {
  getAddress: async (): Promise<string> => {
    const ipAddr: string = await ipcRenderer.invoke("getAddress");
    return ipAddr;
  },
  getBasePath: async (): Promise<string> => {
    const path: string = await ipcRenderer.invoke("getBasePath");
    return path;
  },
};
