import { BrowserWindow, ipcMain } from "electron";
import { FileShare } from "./fileShare";

export const setFileShareIpcHandler = (mainWindow: BrowserWindow): void => {
  const fileShare = new FileShare();

  ipcMain.handle(
    "getFileInfo",
    async (event: Electron.IpcMainInvokeEvent, fileName: string) => {
      return fileShare.getFileInfo(fileName);
    },
  );

  ipcMain.handle(
    "sendFileBuffer",
    async (
      event: Electron.IpcMainInvokeEvent,
      fileName: string,
      fileTransferId: string,
    ) => {
      return await fileShare.sendStreamFile(
        fileName,
        fileTransferId,
        mainWindow,
      );
    },
  );

  ipcMain.handle(
    "setFileInfo",
    async (
      event: Electron.IpcMainInvokeEvent,
      fileName: string,
      fileSize: number,
    ) => {
      return fileShare.setFileInfo(fileName, fileSize);
    },
  );

  ipcMain.handle(
    "recvFileBuffer",
    async (
      event: Electron.IpcMainInvokeEvent,
      fileName: string,
      buffer: Uint8Array,
    ) => {
      return fileShare.recvStreamFile(fileName, buffer, mainWindow);
    },
  );

  ipcMain.handle(
    "destroyRecvFileBuffer",
    async (event: Electron.IpcMainInvokeEvent, fileName: string) => {
      return fileShare.destroyRecvStreamFile(fileName);
    },
  );

  ipcMain.handle(
    "initFileWatch",
    (event: Electron.IpcMainInvokeEvent, dirPath: string) => {
      if (fileShare.initFileWatch(dirPath)) {
        return fileShare.sendFilechange(mainWindow);
      }
      return false;
    },
  );

  ipcMain.handle(
    "sendFileWatch",
    (event: Electron.IpcMainInvokeEvent, dirPath: string) => {
      return fileShare.sendFilelist(mainWindow, dirPath);
    },
  );
};
