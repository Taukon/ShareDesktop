import {
  type DtlsParameters,
  type RtpCapabilities,
} from "mediasoup/node/lib/types";
import { type Socket } from "socket.io";
import { type ServerWebRTC } from "../serverWebRTC";
import {
  type ConsumeDataParams,
  type ProduceDataParams,
  type RtcTransportParams,
} from "../serverWebRTC/common/type";
import type * as desktopType from "../serverWebRTC/desktop/type";
import { type SignalingEventEmitter } from "./signalingEvent";
import { type Callback, type FileInfo } from "./type";

export const setSignalingDesktop = (
  socket: Socket,
  serverWebRTC: ServerWebRTC,
  fileEventEmitter: SignalingEventEmitter,
  enableAudio: boolean,
): void => {
  socket.emit("desktopId", socket.id);

  fileEventEmitter.onReqRtpCap(socket);

  socket.on("resRtpCap", (res: { clientId: string; status: boolean }) => {
    fileEventEmitter.resRtpCap(socket.id, res.clientId, res.status);
  });

  socket.on(
    "getRtpCapabilities",
    async (desktopId: string, callback: Callback<RtpCapabilities>) => {
      const dropId = serverWebRTC.verifyTotalDesktop();
      if (dropId) {
        // desktopServer.to(dropId).emit("end");
        fileEventEmitter.requestDropId(dropId);
      }
      const params = await serverWebRTC.getRtpCapabilitiesForDesktop(
        desktopId,
        enableAudio,
      );
      if (params != null) {
        callback(params);
      }
    },
  );

  socket.on(
    "createDesktopControl",
    async (desktopId: string, callback: Callback<RtcTransportParams>) => {
      const params = await serverWebRTC.createDesktopControl(desktopId);
      if (params != null) {
        callback(params);
      }
    },
  );

  socket.on(
    "connectDesktopControl",
    async (
      req: { desktopId: string; dtlsParameters: DtlsParameters },
      callback: Callback<true>,
    ) => {
      const params = await serverWebRTC.connectDesktopControl(
        req.desktopId,
        req.dtlsParameters,
      );
      if (params) {
        callback(params);
      }
    },
  );

  socket.on(
    "establishDesktopControl",
    async (desktopId: string, callback: Callback<ConsumeDataParams>) => {
      const params = await serverWebRTC.establishDesktopControl(desktopId);
      if (params != null) {
        callback(params);
      }
    },
  );

  socket.on(
    "createDesktopScreen",
    async (desktopId: string, callback: Callback<RtcTransportParams>) => {
      const params = await serverWebRTC.createDesktopScreen(desktopId);
      if (params != null) {
        callback(params);
      }
    },
  );

  socket.on(
    "connectDesktopScreen",
    async (
      req: {
        desktopId: string;
        dtlsParameters: DtlsParameters;
      },
      callback: Callback<true>,
    ) => {
      const params = await serverWebRTC.connectDesktopScreen(
        req.desktopId,
        req.dtlsParameters,
      );
      if (params) {
        callback(params);
      }
    },
  );

  socket.on(
    "establishDesktopScreen",
    async (
      req: { desktopId: string; produceParameters: ProduceDataParams },
      callback: Callback<string>,
    ) => {
      const params = await serverWebRTC.establishDesktopScreen(
        req.desktopId,
        req.produceParameters,
      );
      if (params) {
        callback(params);
      }
    },
  );

  socket.on(
    "establishDesktopAudio",
    async (
      desktopId: string,
      callback: Callback<desktopType.AudioResponse>,
    ) => {
      if (await serverWebRTC.createDesktopAudio(desktopId, false)) {
        const params = serverWebRTC.establishDesktopAudio(desktopId);
        if (params != null) {
          callback(params);
        }
      }
    },
  );

  // ------ File Watch
  socket.on(
    "createFileWatch",
    async (desktopId: string, callback: Callback<RtcTransportParams>) => {
      const params = await serverWebRTC.createDesktopFileWatch(desktopId);
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
      const params = await serverWebRTC.connectDesktopFileWatch(
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
    async (
      req: { desktopId: string; produceParameters: ProduceDataParams },
      callback: Callback<string>,
    ) => {
      const params = await serverWebRTC.establishDesktopFileWatch(
        req.desktopId,
        req.produceParameters,
      );
      if (params) {
        callback(params);
      }
    },
  );

  socket.on("disconnect", () => {
    serverWebRTC.disconnectDesktop(socket.id);
  });

  // -------------- File Transfer --------------

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
      fileEventEmitter.setFileProducer(req); // p(D)=>c(B)
      fileEventEmitter.waitFileConsumer(req.fileTransferId, callback); // c(B)=>p(D)
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
    fileEventEmitter.setFileConsumer(fileTransferId); // c(D)=>p(B)
  });
};
