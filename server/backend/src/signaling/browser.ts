import {
  type DtlsParameters,
  type RtpCapabilities,
} from "mediasoup/node/lib/types";
import { type Server, type Socket } from "socket.io";
import { type ServerWebRTC } from "../serverWebRTC";
import type * as browserType from "../serverWebRTC/browser/type";
import {
  type ConsumeDataParams,
  type ProduceDataParams,
  type RtcTransportParams,
} from "../serverWebRTC/common/type";
import { type SignalingEventEmitter } from "./signalingEvent";
import {
  Access,
  ClientInfo,
  type Callback,
  type FileInfo,
  AuthInfo,
} from "./type";
import { UserManage } from "../userManage";

// TODO fileshare
export const setSignalingBrowser = (
  desktopServer: Server,
  socket: Socket,
  serverWebRTC: ServerWebRTC,
  fileEventEmitter: SignalingEventEmitter,
  userManage: UserManage,
): void => {
  const browserId = userManage.addBrowserUser(socket.id);

  socket.on("reqRtpCap", (info: ClientInfo) => {
    const authInfo: AuthInfo = {
      clientId: browserId,
      desktopId: info.desktopId,
      password: info.password,
    };

    const desktopSocketId = userManage.getDesktopUser(info.desktopId)?.socketId;
    if (desktopSocketId && serverWebRTC.isDesktopId(info.desktopId)) {
      desktopServer.to(desktopSocketId).emit("reqRtpCap", authInfo);
    } else {
      socket.emit("resRtpCap");
    }
  });

  socket.on(
    "createMediaControl",
    async (access: Access, callback: Callback<RtcTransportParams>) => {
      if (
        !userManage.checkBrowserToken(browserId, access.desktopId, access.token)
      ) {
        return;
      }

      const params = await serverWebRTC.createBrowserControl(
        browserId,
        access.desktopId,
      );
      if (params) {
        callback(params);
      }
    },
  );

  socket.on(
    "connectMediaControl",
    async (
      req: { access: Access; dtlsParameters: DtlsParameters },
      callback: Callback<true>,
    ) => {
      if (
        !userManage.checkBrowserToken(
          browserId,
          req.access.desktopId,
          req.access.token,
        )
      ) {
        return;
      }

      const params = await serverWebRTC.connectBrowserControl(
        browserId,
        req.access.desktopId,
        req.dtlsParameters,
      );
      if (params) {
        callback(params);
      }
    },
  );

  socket.on(
    "establishMediaControl",
    async (
      req: { access: Access; produceParameters: ProduceDataParams },
      callback: Callback<string>,
    ) => {
      if (
        !userManage.checkBrowserToken(
          browserId,
          req.access.desktopId,
          req.access.token,
        )
      ) {
        return;
      }

      const params = await serverWebRTC.establishBrowserControl(
        browserId,
        req.access.desktopId,
        req.produceParameters,
      );
      if (params) {
        callback(params);
      }
    },
  );

  socket.on(
    "createMediaScreenOrAudio",
    async (
      req: { access: Access; isAudio: boolean },
      callback: Callback<RtcTransportParams>,
    ) => {
      if (
        !userManage.checkBrowserToken(
          browserId,
          req.access.desktopId,
          req.access.token,
        )
      ) {
        return;
      }

      const params = await serverWebRTC.createBrowserScreenOrAudio(
        browserId,
        req.access.desktopId,
        req.isAudio,
      );
      if (params) {
        callback(params);
      }
    },
  );

  socket.on(
    "connectMediaScreenOrAudio",
    async (
      req: {
        access: Access;
        dtlsParameters: DtlsParameters;
        isAudio: boolean;
      },
      callback: Callback<true>,
    ) => {
      if (
        !userManage.checkBrowserToken(
          browserId,
          req.access.desktopId,
          req.access.token,
        )
      ) {
        return;
      }

      const params = await serverWebRTC.connectBrowserScreenOrAudio(
        browserId,
        req.access.desktopId,
        req.dtlsParameters,
        req.isAudio,
      );
      if (params) {
        callback(params);
      }
    },
  );

  socket.on(
    "establishMediaScreen",
    async (
      access: Access,
      callback: Callback<ConsumeDataParams | undefined>,
    ) => {
      if (
        !userManage.checkBrowserToken(browserId, access.desktopId, access.token)
      ) {
        return;
      }

      const params = await serverWebRTC.establishBrowserScreen(
        browserId,
        access.desktopId,
      );
      callback(params);
    },
  );

  socket.on(
    "establishMediaAudio",
    async (
      req: {
        access: Access;
        rtpCapabilities: RtpCapabilities;
      },
      callback: Callback<browserType.AudioResponse | undefined>,
    ) => {
      if (
        !userManage.checkBrowserToken(
          browserId,
          req.access.desktopId,
          req.access.token,
        )
      ) {
        return;
      }

      const params = await serverWebRTC.establishBrowserAudio(
        browserId,
        req.access.desktopId,
        req.rtpCapabilities,
      );
      callback(params);
    },
  );

  socket.on(
    "createFileWatch",
    async (access: Access, callback: Callback<RtcTransportParams>) => {
      if (
        !userManage.checkBrowserToken(browserId, access.desktopId, access.token)
      ) {
        return;
      }

      const params = await serverWebRTC.createBrowserFileWatch(
        browserId,
        access.desktopId,
      );
      if (params) {
        callback(params);
      }
    },
  );

  socket.on(
    "connectFileWatch",
    async (
      req: {
        access: Access;
        dtlsParameters: DtlsParameters;
      },
      callback: Callback<true>,
    ) => {
      if (
        !userManage.checkBrowserToken(
          browserId,
          req.access.desktopId,
          req.access.token,
        )
      ) {
        return;
      }

      const params = await serverWebRTC.connectBrowserFileWatch(
        browserId,
        req.access.desktopId,
        req.dtlsParameters,
      );
      if (params) {
        callback(params);
      }
    },
  );

  socket.on(
    "establishFileWatch",
    async (
      access: Access,
      callback: Callback<ConsumeDataParams | undefined>,
    ) => {
      if (
        !userManage.checkBrowserToken(browserId, access.desktopId, access.token)
      ) {
        return;
      }

      const params = await serverWebRTC.establishBrowserFileWatch(
        browserId,
        access.desktopId,
      );
      callback(params);
    },
  );

  socket.on("requestFileWatch", (access: Access) => {
    if (
      !userManage.checkBrowserToken(browserId, access.desktopId, access.token)
    ) {
      return;
    }

    const socketId = userManage.getDesktopUser(access.desktopId)?.socketId;
    if (socketId) fileEventEmitter.requestFileWatch(socketId);
  });

  socket.on("disconnect", () => {
    userManage.removeBrowserUser(browserId);
    serverWebRTC.disconnectBrowserClient(browserId);
  });

  // -------------- File Transfer --------------
  // Send FIle from Desktop to Browser
  socket.on(
    "initRecvFileTransfer",
    async (
      req: {
        access: Access;
        fileName: string;
      },
      callback: Callback<FileInfo>,
    ) => {
      if (
        !userManage.checkBrowserToken(
          browserId,
          req.access.desktopId,
          req.access.token,
        )
      ) {
        return;
      }

      const params = serverWebRTC.initFileTransfer();
      console.log(`init recv ${params}`);
      const socketId = userManage.getDesktopUser(req.access.desktopId)
        ?.socketId;
      if (params && socketId) {
        fileEventEmitter.requestSendFile(socketId, req.fileName, params);
        fileEventEmitter.waitFileProducer(params, callback); // p(D)=>c(B)
      }
    },
  );

  // Send FIle from Browser to Desktop
  socket.on(
    "initSendFileTransfer",
    async (access: Access, callback: Callback<string>) => {
      if (
        !userManage.checkBrowserToken(browserId, access.desktopId, access.token)
      ) {
        return;
      }

      const params = serverWebRTC.initFileTransfer();
      const socketId = userManage.getDesktopUser(access.desktopId)?.socketId;
      if (params && socketId) {
        callback(params); // ->waitFileConsumer
        fileEventEmitter.requestRecvFile(socketId, params); // p(B)=>c(D)
      }
    },
  );

  socket.on("endTransferFile", (fileTransferId: string) => {
    serverWebRTC.disconnectFileTransfer(fileTransferId);
  });

  socket.on(
    "createSendFile",
    async (fileTransferId: string, callback: Callback<RtcTransportParams>) => {
      const params = await serverWebRTC.createSendFile(fileTransferId);
      if (params) {
        callback(params);
      }
    },
  );

  socket.on(
    "connectSendFile",
    async (
      req: {
        fileTransferId: string;
        dtlsParameters: DtlsParameters;
      },
      callback: Callback<true>,
    ) => {
      const params = await serverWebRTC.connectSendFile(
        req.fileTransferId,
        req.dtlsParameters,
      );
      if (params) {
        callback(params);
      }
    },
  );

  socket.on(
    "establishSendFile",
    async (
      req: {
        fileTransferId: string;
        produceParameters: ProduceDataParams;
      },
      callback: Callback<string>,
    ) => {
      const params = await serverWebRTC.establishSendFile(
        req.fileTransferId,
        req.produceParameters,
      );
      if (params) {
        callback(params);
      }
    },
  );

  // for produce send
  socket.on(
    "waitFileConsumer",
    async (req: FileInfo, callback: Callback<string>) => {
      fileEventEmitter.setFileProducer(req); // p(B)=>c(D)
      fileEventEmitter.waitFileConsumer(req.fileTransferId, callback); // c(D)=>p(B)
    },
  );

  socket.on(
    "createRecvFile",
    async (fileTransferId: string, callback: Callback<RtcTransportParams>) => {
      const params = await serverWebRTC.createRecvFile(fileTransferId);
      if (params) {
        callback(params);
      }
    },
  );

  socket.on(
    "connectRecvFile",
    async (
      req: {
        fileTransferId: string;
        dtlsParameters: DtlsParameters;
      },
      callback: Callback<true>,
    ) => {
      const params = await serverWebRTC.connectRecvFile(
        req.fileTransferId,
        req.dtlsParameters,
      );
      console.log(`connectRecvFile ${params}`);
      if (params) {
        callback(params);
      }
    },
  );

  socket.on(
    "establishRecvFile",
    async (fileTransferId: string, callback: Callback<ConsumeDataParams>) => {
      const params = await serverWebRTC.establishRecvFile(fileTransferId);
      if (params) {
        callback(params);
      }
    },
  );

  socket.on("setFileConsumer", async (fileTransferId: string) => {
    fileEventEmitter.setFileConsumer(fileTransferId); // c(B)=>p(D)
  });
};
