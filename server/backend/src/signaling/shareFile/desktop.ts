import { type Server, type Socket } from "socket.io";
import { ShareFile } from "../../serverShare/shareFile";
import {
  type ConsumeDataParams,
  type ProduceDataParams,
  type RtcTransportParams,
} from "../../serverShare/common/type";
import { UserManage } from "../../userManage";
import { Callback } from "../type";
import { transferNode } from "../../serverShare/shareFile/transfer";
import { DtlsParameters, RtpCapabilities } from "mediasoup/node/lib/types";

// TODO create Token
export const signalingFileDesktop = (
  desktopServer: Server,
  clientServer: Server,
  socket: Socket,
  shareFile: ShareFile,
  userManage: UserManage
): void => {

  socket.on(
    "getRtpCapFile",
    async (
      desktopId: string,
      callback: Callback<RtpCapabilities | undefined>,
    ) => {
      const dropId = shareFile.verifyTotalDesktop();
      if (dropId) {
        const socketId = userManage.getDesktopUser(dropId)?.socketId;
        if (socketId) desktopServer.to(socketId).emit("end");
      }
      const params = await shareFile.getRtpCapDesktop(desktopId);
      callback(params);
    },
  );

  // -------------- File Watch --------------

  socket.on(
    "createFileWatch",
    async (
      desktopId: string,
      callback: Callback<RtcTransportParams | undefined>,
    ) => {
      const params = await shareFile.createDesktopFileWatch(desktopId);
      callback(params);
    },
  );

  socket.on(
    "connectFileWatch",
    async (
      req: {
        desktopId: string;
        dtlsParameters: DtlsParameters;
      },
      callback: Callback<boolean>,
    ) => {
      const params = await shareFile.connectDesktopFileWatch(
        req.desktopId,
        req.dtlsParameters,
      );
      callback(params);
    },
  );

  socket.on(
    "establishFileWatch",
    async (
      req: { desktopId: string; produceParameters: ProduceDataParams },
      callback: Callback<string | undefined>,
    ) => {
      const params = await shareFile.establishDesktopFileWatch(
        req.desktopId,
        req.produceParameters,
      );
      callback(params);
    },
  );

  // -------------- File Transfer --------------

  socket.on("endTransferFile", (fileTransferId: string) => {
    shareFile.disconnectTransfer(fileTransferId);
  });

  socket.on("setFileProducer", (fileTransferId: string, browserId: string) => {
    const browserSocketId = userManage.getBrowserSocketId(browserId);
    if (browserSocketId) {
      clientServer.to(browserSocketId).emit("setFileProducer", fileTransferId);
    }
  });

  socket.on(
    "createSendFile",
    async (
      fileTransferId: string,
      callback: Callback<RtcTransportParams | undefined>,
    ) => {
      const params = await shareFile.createSendFile(
        fileTransferId,
        transferNode.desktop,
      );
      callback(params);
    },
  );

  socket.on(
    "connectSendFile",
    async (
      req: {
        fileTransferId: string;
        dtlsParameters: DtlsParameters;
      },
      callback: Callback<boolean>,
    ) => {
      const params = await shareFile.connectSendFile(
        req.fileTransferId,
        req.dtlsParameters,
        transferNode.desktop,
      );
      callback(params);
    },
  );

  socket.on(
    "establishSendFile",
    async (
      req: {
        fileTransferId: string;
        produceParameters: ProduceDataParams;
      },
      callback: Callback<string | undefined>,
    ) => {
      const params = await shareFile.establishSendFile(
        req.fileTransferId,
        req.produceParameters,
        transferNode.desktop,
      );
      callback(params);
    },
  );

  socket.on(
    "createRecvFile",
    async (
      fileTransferId: string,
      callback: Callback<RtcTransportParams | undefined>,
    ) => {
      const params = await shareFile.createRecvFile(
        fileTransferId,
        transferNode.desktop,
      );
      callback(params);
    },
  );

  socket.on(
    "connectRecvFile",
    async (
      req: {
        fileTransferId: string;
        dtlsParameters: DtlsParameters;
      },
      callback: Callback<boolean>,
    ) => {
      const params = await shareFile.connectRecvFile(
        req.fileTransferId,
        req.dtlsParameters,
        transferNode.desktop,
      );
      callback(params);
    },
  );

  socket.on(
    "establishRecvFile",
    async (
      fileTransferId: string,
      callback: Callback<ConsumeDataParams | undefined>,
    ) => {
      const params = await shareFile.establishRecvFile(
        fileTransferId,
        transferNode.desktop,
      );
      callback(params);
    },
  );
};
