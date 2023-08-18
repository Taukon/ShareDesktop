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
import { type Callback, type FileInfo } from "./type";

export const setSignalingBrowser = (
  clientServer: Server,
  socket: Socket,
  serverWebRTC: ServerWebRTC,
  fileEventEmitter: SignalingEventEmitter,
  enableAudio: boolean,
): void => {
  socket.on(
    "getRtpCapabilities",
    async (desktopId: string, callback: Callback<RtpCapabilities>) => {
      const dropId = serverWebRTC.verifyTotalBrowser();
      if (dropId) {
        clientServer.to(dropId).emit("end");
      }
      const params = await serverWebRTC.getRtpCapabilitiesForBrowser(
        socket.id,
        desktopId,
        enableAudio,
      );
      if (params != null) {
        callback(params);
      }
    },
  );

  socket.on(
    "createMediaControl",
    async (desktopId: string, callback: Callback<RtcTransportParams>) => {
      const params = await serverWebRTC.createBrowserControl(
        socket.id,
        desktopId,
      );
      if (params != null) {
        callback(params);
      }
    },
  );

  socket.on(
    "connectMediaControl",
    async (
      req: { desktopId: string; dtlsParameters: DtlsParameters },
      callback: Callback<true>,
    ) => {
      const params = await serverWebRTC.connectBrowserControl(
        socket.id,
        req.desktopId,
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
      req: { desktopId: string; produceParameters: ProduceDataParams },
      callback: Callback<string>,
    ) => {
      const params = await serverWebRTC.establishBrowserControl(
        socket.id,
        req.desktopId,
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
      req: { desktopId: string; isAudio: boolean },
      callback: Callback<RtcTransportParams>,
    ) => {
      const params = await serverWebRTC.createBrowserScreenOrAudio(
        socket.id,
        req.desktopId,
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
        desktopId: string;
        dtlsParameters: DtlsParameters;
        isAudio: boolean;
      },
      callback: Callback<true>,
    ) => {
      const params = await serverWebRTC.connectBrowserScreenOrAudio(
        socket.id,
        req.desktopId,
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
    async (desktopId: string, callback: Callback<ConsumeDataParams>) => {
      const params = await serverWebRTC.establishBrowserScreen(
        socket.id,
        desktopId,
      );
      if (params != null) {
        callback(params);
      }
    },
  );

  socket.on(
    "establishMediaAudio",
    async (
      req: {
        desktopId: string;
        rtpCapabilities: RtpCapabilities;
      },
      callback: Callback<browserType.AudioResponse>,
    ) => {
      const params = await serverWebRTC.establishBrowserAudio(
        socket.id,
        req.desktopId,
        req.rtpCapabilities,
      );
      if (params != null) {
        callback(params);
      }
    },
  );

  socket.on(
    "createFileWatch",
    async (desktopId: string, callback: Callback<RtcTransportParams>) => {
      const params = await serverWebRTC.createBrowserFileWatch(
        socket.id,
        desktopId,
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
        desktopId: string;
        dtlsParameters: DtlsParameters;
      },
      callback: Callback<true>,
    ) => {
      const params = await serverWebRTC.connectBrowserFileWatch(
        socket.id,
        req.desktopId,
        req.dtlsParameters,
      );
      if (params) {
        callback(params);
      }
    },
  );

  socket.on(
    "establishFileWatch",
    async (desktopId: string, callback: Callback<ConsumeDataParams>) => {
      const params = await serverWebRTC.establishBrowserFileWatch(
        socket.id,
        desktopId,
      );
      if (params != null) {
        callback(params);
      }
    },
  );

  socket.on("requestFileWatch", (desktopId: string) => {
    fileEventEmitter.requestFileWatch(desktopId);
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
        desktopId: string;
        fileName: string;
      },
      callback: Callback<FileInfo>,
    ) => {
      const params = serverWebRTC.initFileTransfer();
      console.log(`init recv ${params}`);
      if (params) {
        fileEventEmitter.requestSendFile(req.desktopId, req.fileName, params);
        fileEventEmitter.waitFileProducer(params, callback); // p(D)=>c(B)
      }
    },
  );

  // Send FIle from Browser to Desktop
  socket.on(
    "initSendFileTransfer",
    async (desktopId: string, callback: Callback<string>) => {
      const params = serverWebRTC.initFileTransfer();
      if (params) {
        callback(params); // ->waitFileConsumer
        fileEventEmitter.requestRecvFile(desktopId, params); // p(B)=>c(D)
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
