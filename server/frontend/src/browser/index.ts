import { Socket } from "socket.io-client";
import { ShareApp } from "./shareApp";
import { Access } from "./signaling/type";
import { ShareFile } from "./shareFile";
import { reqAuth } from "./signaling/common";
import { Device } from "mediasoup-client";

export type BrowserWebRTC = {
  device?: Device;
  access: Access;
  shareApp: ShareApp;
  shareFile: ShareFile;
};

export const initShareApp = (desktopId: string, onAudio: boolean): ShareApp => {
  return new ShareApp(desktopId, onAudio);
};

export const initShareFile = (desktopId: string): ShareFile => {
  return new ShareFile(desktopId);
};

export const reqAccess = (
  socket: Socket,
  desktopId: string,
  password: string,
  init: (socket: Socket, access: Access) => void,
) => {
  reqAuth(socket, { desktopId, password });

  socket.once("resAuth", async (info: Access | undefined) => {
    console.log(info);
    if (info) {
      const access: Access = {
        desktopId: info.desktopId,
        token: info.token,
      };
      init(socket, access);
    }
  });
};
