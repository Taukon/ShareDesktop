import { Socket } from "socket.io-client";
import { ClientInfo } from "./type";

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

export const reqAuth = (socket: Socket, info: ClientInfo): void => {
  socket.emit("reqAuth", info);
};
