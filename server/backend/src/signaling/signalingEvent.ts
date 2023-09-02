import { EventEmitter } from "events";
import { Socket, type Server } from "socket.io";
import { AuthInfo, type Callback, type FileInfo } from "./type";

export class SignalingEventEmitter {
  private readonly eventEmitter = new EventEmitter();

  constructor(desktopServer: Server) {
    this.listenRequestFile(desktopServer);
    this.listenDropId(desktopServer);
  }

  public clean() {
    this.eventEmitter.removeAllListeners();
  }

  public reqRtpCap(clientId: string, desktopId: string, password: string) {
    const info: AuthInfo = {
      clientId: clientId,
      desktopId: desktopId,
      password: password,
    };
    this.eventEmitter.emit(`${desktopId}:reqRtpCap`, info);
  }

  public onReqRtpCap(desktopSocket: Socket) {
    this.eventEmitter.on(`${desktopSocket.id}:reqRtpCap`, (req: AuthInfo) => {
      desktopSocket.emit("reqRtpCap", req);
    });
  }

  public resRtpCap(desktopId: string, clientId: string, status: boolean) {
    this.eventEmitter.emit(
      `${clientId}:resRtpCap`,
      desktopId,
      clientId,
      status,
    );
  }

  public setRtpCap(
    socketId: string,
    callback: (
      desktopId: string,
      clientId: string,
      status: boolean,
    ) => Promise<void>,
  ) {
    this.eventEmitter.on(
      `${socketId}:resRtpCap`,
      (desktopId: string, clientId: string, status: boolean) => {
        if (socketId === clientId) callback(desktopId, clientId, status);
      },
    );
  }

  public requestDropId(desktopSocketId: string) {
    this.eventEmitter.emit("dropId", desktopSocketId);
  }

  private listenDropId(desktopServer: Server) {
    this.eventEmitter.on("dropId", (desktopSocketId: string) => {
      desktopServer.to(desktopSocketId).emit("end");
    });
  }

  public requestFileWatch(desktopSocketId: string) {
    this.eventEmitter.emit("requestFileWatch", desktopSocketId);
  }

  public requestRecvFile(desktopSocketId: string, fileTransferId: string) {
    this.eventEmitter.once(
      `${fileTransferId}:ProducerSet`,
      (fileInfo: FileInfo) => {
        this.eventEmitter.emit("requestRecvFile", desktopSocketId, fileInfo);
      },
    );
  }

  public requestSendFile(
    desktopSocketId: string,
    fileName: string,
    fileTransferId: string,
  ) {
    this.eventEmitter.emit(
      "requestSendFile",
      desktopSocketId,
      fileName,
      fileTransferId,
    );
  }

  private listenRequestFile(desktopServer: Server) {
    this.eventEmitter.on("requestFileWatch", (desktopSocketId: string) => {
      desktopServer.to(desktopSocketId).emit("requestFileWatch");
    });

    this.eventEmitter.on(
      "requestRecvFile",
      (desktopSocketId: string, fileInfo: FileInfo) => {
        desktopServer.to(desktopSocketId).emit("requestRecvFile", fileInfo);
      },
    );

    this.eventEmitter.on(
      "requestSendFile",
      (desktopSocketId: string, fileName: string, fileTransferId: string) => {
        desktopServer
          .to(desktopSocketId)
          .emit("requestSendFile", fileTransferId, fileName);
      },
    );
  }

  public setFileConsumer(fileTransferId: string) {
    this.eventEmitter.emit(`${fileTransferId}:ConsumerSet`);
  }

  public waitFileConsumer(fileTransferId: string, callback: Callback<string>) {
    this.eventEmitter.once(`${fileTransferId}:ConsumerSet`, () => {
      callback(fileTransferId);
    });
  }

  public setFileProducer(fileInfo: FileInfo) {
    this.eventEmitter.emit(`${fileInfo.fileTransferId}:ProducerSet`, fileInfo);
  }

  public waitFileProducer(
    fileTransferId: string,
    callback: Callback<FileInfo>,
  ) {
    this.eventEmitter.once(
      `${fileTransferId}:ProducerSet`,
      (fileInfo: FileInfo) => {
        callback(fileInfo);
      },
    );
  }
}
