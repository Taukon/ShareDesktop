import {
  type DtlsParameters,
  type RtpCapabilities,
} from "mediasoup/node/lib/types";
import { type Server, type Socket } from "socket.io";
import { ShareApp } from "../../serverShare/shareApp";
import {
  ProducerParams,
  type ConsumeDataParams,
  type ProduceDataParams,
  type RtcTransportParams,
} from "../../serverShare/common/type";
import { UserManage } from "../../userManage";
import { Callback } from "../type";

export const signalingAppDesktop = (
  desktopServer: Server,
  socket: Socket,
  shareApp: ShareApp,
  userManage: UserManage,
): void => {
  socket.on(
    "getRtpCapApp",
    async (
      desktopId: string,
      callback: Callback<RtpCapabilities | undefined>,
    ) => {
      const dropId = shareApp.verifyTotalDesktop();
      if (dropId) {
        const socketId = userManage.getDesktopUser(dropId)?.socketId;
        if (socketId) desktopServer.to(socketId).emit("end");
      }
      const params = await shareApp.getRtpCapDesktop(desktopId);
      callback(params);
    },
  );

  socket.on(
    "createDesktopControl",
    async (
      desktopId: string,
      callback: Callback<RtcTransportParams | undefined>,
    ) => {
      const params = await shareApp.createDesktopControl(desktopId);
      callback(params);
    },
  );

  socket.on(
    "connectDesktopControl",
    async (
      req: { desktopId: string; dtlsParameters: DtlsParameters },
      callback: Callback<boolean>,
    ) => {
      const params = await shareApp.connectDesktopControl(
        req.desktopId,
        req.dtlsParameters,
      );
      callback(params);
    },
  );

  socket.on(
    "establishDesktopControl",
    async (
      desktopId: string,
      callback: Callback<ConsumeDataParams | undefined>,
    ) => {
      const params = await shareApp.establishDesktopControl(desktopId);
      callback(params);
    },
  );

  socket.on(
    "createDesktopScreen",
    async (
      desktopId: string,
      callback: Callback<RtcTransportParams | undefined>,
    ) => {
      const params = await shareApp.createDesktopScreen(desktopId);
      callback(params);
    },
  );

  socket.on(
    "connectDesktopScreen",
    async (
      req: {
        desktopId: string;
        dtlsParameters: DtlsParameters;
      },
      callback: Callback<boolean>,
    ) => {
      const params = await shareApp.connectDesktopScreen(
        req.desktopId,
        req.dtlsParameters,
      );
      callback(params);
    },
  );

  socket.on(
    "establishDesktopScreen",
    async (
      req: { desktopId: string; produceParameters: ProduceDataParams },
      callback: Callback<string | undefined>,
    ) => {
      const params = await shareApp.establishDesktopScreen(
        req.desktopId,
        req.produceParameters,
      );
      callback(params);
    },
  );

  // ---------- audio
  socket.on(
    "createDesktopAudio",
    async (
      desktopId: string,
      callback: Callback<RtcTransportParams | undefined>,
    ) => {
      const params = await shareApp.createDesktopAudio(desktopId);
      callback(params);
    },
  );

  socket.on(
    "connectDesktopAudio",
    async (
      req: {
        desktopId: string;
        dtlsParameters: DtlsParameters;
      },
      callback: Callback<boolean>,
    ) => {
      const params = await shareApp.connectDesktopAudio(
        req.desktopId,
        req.dtlsParameters,
      );
      callback(params);
    },
  );

  socket.on(
    "establishDesktopAudio",
    async (
      req: { desktopId: string; produceParameters: ProducerParams },
      callback: Callback<string | undefined>,
    ) => {
      const params = await shareApp.establishDesktopAudio(
        req.desktopId,
        req.produceParameters,
      );
      callback(params);
    },
  );

  // socket.on(
  //   "establishDesktopAudio",
  //   async (
  //     desktopId: string,
  //     callback: Callback<desktopType.AudioResponse | undefined>,
  //   ) => {
  //     if (await shareApp.createDesktopAudio(desktopId, false)) {
  //       const params = shareApp.establishDesktopAudio(desktopId);
  //       callback(params);
  //     } else {
  //       callback(undefined);
  //     }
  //   },
  // );
};
