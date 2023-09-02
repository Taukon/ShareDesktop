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
import { Access, ClientInfo, type Callback, type FileInfo } from "./type";

export const setSignalingBrowser = (
  clientServer: Server,
  socket: Socket,
  serverWebRTC: ServerWebRTC,
  fileEventEmitter: SignalingEventEmitter,
  enableAudio: boolean,
): void => {
  fileEventEmitter.setRtpCap(
    socket.id,
    async (desktopId: string, clientId: string, status: boolean) => {
      if (status) {
        const dropId = serverWebRTC.verifyTotalBrowser();
        if (dropId) {
          clientServer.to(dropId).emit("end");
        }
        const rtpCap = await serverWebRTC.getRtpCapabilitiesForBrowser(
          socket.id,
          desktopId,
          enableAudio,
        );
        clientServer.to(clientId).emit("resRtpCap", {
          desktopId: desktopId,
          token: "aaaa",
          rtpCap: rtpCap,
        });
      }
    },
  );

  socket.on("reqRtpCap", (info: ClientInfo) => {
    fileEventEmitter.reqRtpCap(socket.id, info.desktopId, info.password);
  });

  socket.on(
    "createMediaControl",
    async (access: Access, callback: Callback<RtcTransportParams>) => {
      const params = await serverWebRTC.createBrowserControl(
        socket.id,
        access.desktopId,
      );
      if (params != null) {
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
      const params = await serverWebRTC.connectBrowserControl(
        socket.id,
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
      const params = await serverWebRTC.establishBrowserControl(
        socket.id,
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
      const params = await serverWebRTC.createBrowserScreenOrAudio(
        socket.id,
        req.access.desktopId,
        req.isAudio,
      );
      if (params != null) {
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
      const params = await serverWebRTC.connectBrowserScreenOrAudio(
        socket.id,
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
      const params = await serverWebRTC.establishBrowserScreen(
        socket.id,
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
      const params = await serverWebRTC.establishBrowserAudio(
        socket.id,
        req.access.desktopId,
        req.rtpCapabilities,
      );
      callback(params);
    },
  );

  socket.on(
    "createFileWatch",
    async (access: Access, callback: Callback<RtcTransportParams>) => {
      const params = await serverWebRTC.createBrowserFileWatch(
        socket.id,
        access.desktopId,
      );
      if (params != null) {
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
      const params = await serverWebRTC.connectBrowserFileWatch(
        socket.id,
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
      const params = await serverWebRTC.establishBrowserFileWatch(
        socket.id,
        access.desktopId,
      );
      callback(params);
    },
  );

  socket.on("requestFileWatch", (access: Access) => {
    fileEventEmitter.requestFileWatch(access.desktopId);
  });

  socket.on("disconnect", () => {
    serverWebRTC.disconnectBrowserClient(socket.id);
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
      const params = serverWebRTC.initFileTransfer();
      console.log(`init recv ${params}`);
      if (params) {
        fileEventEmitter.requestSendFile(
          req.access.desktopId,
          req.fileName,
          params,
        );
        fileEventEmitter.waitFileProducer(params, callback); // p(D)=>c(B)
      }
    },
  );

  // Send FIle from Browser to Desktop
  socket.on(
    "initSendFileTransfer",
    async (access: Access, callback: Callback<string>) => {
      const params = serverWebRTC.initFileTransfer();
      if (params) {
        callback(params); // ->waitFileConsumer
        fileEventEmitter.requestRecvFile(access.desktopId, params); // p(B)=>c(D)
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
      if (params != null) {
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
      if (params != null) {
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
      if (params != null) {
        callback(params);
      }
    },
  );

  socket.on("setFileConsumer", async (fileTransferId: string) => {
    fileEventEmitter.setFileConsumer(fileTransferId); // c(B)=>p(D)
  });
};
