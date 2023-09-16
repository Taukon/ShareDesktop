import { Socket } from "socket.io-client";
import { AuthInfo } from "./type";

export const sendRequest = async <T>(
  socket: Socket,
  type: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
): Promise<T> => {
  return new Promise((resolve) => {
    socket.emit(type, data, (res: T) => resolve(res));
  });
};

export const listenAuth = (
  socket: Socket,
  desktopId: string,
  password: string,
) => {
  socket.on("reqAuth", (info: AuthInfo) => {
    if (desktopId === info.desktopId && password === info.password) {
      socket.emit("resAuth", { browserId: info.browserId, status: true });
    } else {
      socket.emit("resAuth", { browserId: info.browserId, status: false });
    }
  });
};
