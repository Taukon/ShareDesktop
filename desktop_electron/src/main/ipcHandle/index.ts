import { networkInterfaces } from "os";
import { BrowserWindow, ipcMain } from "electron";
import { setShareFileIpcHandler } from "./shareFile";
import { setShareAppIpcHandler } from "./shareApp";

export const initIpcHandler = (mainWindow: BrowserWindow): void => {
  setShareAppIpcHandler();
  setShareFileIpcHandler(mainWindow);

  ipcMain.handle("getAddress", () => {
    const ip_addr = getIpAddress() ?? "127.0.0.1"; // --- IP Address
    return ip_addr;
  });

  ipcMain.handle("getBasePath", () => {
    return `${__dirname}`;
  });
};

const getIpAddress = (): string | undefined => {
  const nets = networkInterfaces();
  const net = nets["eth0"]?.find((v) => v.family == "IPv4");
  return net ? net.address : undefined;
};
