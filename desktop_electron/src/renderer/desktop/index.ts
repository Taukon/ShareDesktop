import { Socket } from "socket.io-client";
import { ShareHostApp } from "./shareApp/hostDisplay";
import { ShareVirtualApp } from "./shareApp/virtualDisplay";
import { listenAuth } from "./signaling/common";
import { ShareFile } from "./shareFile";

export const setAuth = (
  desktopId: string,
  socket: Socket,
  password: string,
): void => {
  listenAuth(socket, desktopId, password);
};

export const initShareHostApp = (
  windowId: number,
  desktopId: string,
  socket: Socket,
  interval: number,
  onDisplayScreen: boolean,
  videoStream: MediaStream,
  audioTrack?: MediaStreamTrack,
): ShareHostApp => {
  return new ShareHostApp(
    windowId,
    desktopId,
    socket,
    interval,
    onDisplayScreen,
    videoStream,
    audioTrack,
  );
};

export const initShareVirtualApp = (
  displayNum: number,
  desktopId: string,
  socket: Socket,
  interval: number,
  onDisplayScreen: boolean,
  isFullScreen: boolean,
  audioTrack?: MediaStreamTrack,
): ShareVirtualApp => {
  return new ShareVirtualApp(
    displayNum,
    desktopId,
    socket,
    interval,
    onDisplayScreen,
    isFullScreen,
    audioTrack,
  );
};

export const initShareFile = (desktopId: string, socket: Socket): ShareFile => {
  return new ShareFile(desktopId, socket);
};
