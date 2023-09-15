import { RtpCapabilities, type DtlsParameters } from "mediasoup/node/lib/types";
import { type Server, type Socket } from "socket.io";
import {
  type ProduceDataParams,
  type ConsumeDataParams,
  type RtcTransportParams,
} from "../../serverShare/common/type";
import { Access, type Callback } from "../type";
import { UserManage } from "../../userManage";
import { ShareFile } from "../../serverShare/shareFile";
import { transferNode } from "../../serverShare/shareFile/transfer";

export const signalingFileBrowser = (
  desktopServer: Server,
  socket: Socket,
  shareFile: ShareFile,
  userManage: UserManage,
  browserId: string,
): void => {
  socket.on(
    "getRtpCapApp",
    async (access: Access, callback: Callback<RtpCapabilities | undefined>) => {
      if (
        !userManage.checkBrowserToken(browserId, access.desktopId, access.token)
      ) {
        return callback(undefined);
      }

      const params = await shareFile.getRtpCapBrowser(
        browserId,
        access.desktopId,
      );
      callback(params);
    },
  );

  // -------------- File Watch --------------

  socket.on(
    "requestFileWatch",
    (access: Access) => {
      if (
        !userManage.checkBrowserToken(browserId, access.desktopId, access.token)
      ) {
        return;
      }

      const transferId = shareFile.initFileTransfer();
      console.log(`transferId ${transferId}`);
      const socketId = userManage.getDesktopUser(access.desktopId)?.socketId;
      if (transferId && socketId) {
        desktopServer.to(socketId).emit("requestFileWatch");
      }
    }
  )

  socket.on(
    "createFileWatch",
    async (
      access: Access,
      callback: Callback<RtcTransportParams | undefined>,
    ) => {
      if (
        !userManage.checkBrowserToken(browserId, access.desktopId, access.token)
      ) {
        return;
      }

      const params = await shareFile.createBrowserFileWatch(
        browserId,
        access.desktopId,
      );
      callback(params);
    },
  );

  socket.on(
    "connectFileWatch",
    async (
      req: {
        access: Access;
        dtlsParameters: DtlsParameters;
      },
      callback: Callback<boolean>,
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

      const params = await shareFile.connectBrowserFileWatch(
        browserId,
        req.access.desktopId,
        req.dtlsParameters,
      );
      callback(params);
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
        return callback(undefined);
      }

      const params = await shareFile.establishBrowserFileWatch(
        browserId,
        access.desktopId,
      );
      callback(params);
    },
  );

  // -------------- File Transfer --------------

  socket.on(
    "reqTransfer",
    async (access: Access, callback: Callback<string | undefined>) => {
      if (
        !userManage.checkBrowserToken(browserId, access.desktopId, access.token)
      ) {
        return;
      }

      const transferId = shareFile.initFileTransfer();
      console.log(`transferId ${transferId}`);
      const socketId = userManage.getDesktopUser(access.desktopId)?.socketId;
      if (transferId && socketId) {
        desktopServer.to(socketId).emit("reqTransfer", transferId, browserId);
      }
      callback(transferId);
    },
  );

  socket.on("endTransferFile", (fileTransferId: string) => {
    shareFile.disconnectTransfer(fileTransferId);
  });

  socket.on("setFileProducer", (fileTransferId: string, access: Access) => {
    if (
      !userManage.checkBrowserToken(browserId, access.desktopId, access.token)
    ) {
      return;
    }

    const desktopSocketId = userManage.getDesktopUser(access.desktopId)
      ?.socketId;
    if (desktopSocketId && shareFile.isDesktopId(access.desktopId)) {
      desktopServer.to(desktopSocketId).emit("setFileProducer", fileTransferId);
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
        transferNode.browser,
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
        transferNode.browser,
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
        transferNode.browser,
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
        transferNode.browser,
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
        transferNode.browser,
      );
      console.log(`connectRecvFile ${params}`);
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
        transferNode.browser,
      );
      callback(params);
    },
  );
};
