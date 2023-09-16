import {
  type DtlsParameters,
  type RtpCapabilities,
} from "mediasoup/node/lib/types";
import { type Server, type Socket } from "socket.io";
import type * as browserType from "../../serverShare/shareApp/browser/type";
import {
  type ConsumeDataParams,
  type ProduceDataParams,
  type RtcTransportParams,
} from "../../serverShare/common/type";
import { Access, type Callback } from "../type";
import { UserManage } from "../../userManage";
import { ShareApp } from "../../serverShare/shareApp";

export const signalingAppBrowser = (
  desktopServer: Server,
  socket: Socket,
  shareApp: ShareApp,
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

      const params = await shareApp.getRtpCapBrowser(
        browserId,
        access.desktopId,
      );
      callback(params);
    },
  );

  socket.on(
    "createMediaControl",
    async (
      access: Access,
      callback: Callback<RtcTransportParams | undefined>,
    ) => {
      if (
        !userManage.checkBrowserToken(browserId, access.desktopId, access.token)
      ) {
        return callback(undefined);
      }

      const params = await shareApp.createBrowserControl(
        browserId,
        access.desktopId,
      );
      callback(params);
    },
  );

  socket.on(
    "connectMediaControl",
    async (
      req: { access: Access; dtlsParameters: DtlsParameters },
      callback: Callback<boolean | undefined>,
    ) => {
      if (
        !userManage.checkBrowserToken(
          browserId,
          req.access.desktopId,
          req.access.token,
        )
      ) {
        return callback(undefined);
      }

      const params = await shareApp.connectBrowserControl(
        browserId,
        req.access.desktopId,
        req.dtlsParameters,
      );
      callback(params);
    },
  );

  socket.on(
    "establishMediaControl",
    async (
      req: { access: Access; produceParameters: ProduceDataParams },
      callback: Callback<string | undefined>,
    ) => {
      if (
        !userManage.checkBrowserToken(
          browserId,
          req.access.desktopId,
          req.access.token,
        )
      ) {
        return callback(undefined);
      }

      const params = await shareApp.establishBrowserControl(
        browserId,
        req.access.desktopId,
        req.produceParameters,
      );
      callback(params);
    },
  );

  socket.on(
    "createMediaScreenOrAudio",
    async (
      req: { access: Access; isAudio: boolean },
      callback: Callback<RtcTransportParams | undefined>,
    ) => {
      if (
        !userManage.checkBrowserToken(
          browserId,
          req.access.desktopId,
          req.access.token,
        )
      ) {
        return callback(undefined);
      }

      const params = await shareApp.createBrowserScreenOrAudio(
        browserId,
        req.access.desktopId,
        req.isAudio,
      );
      callback(params);
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
      callback: Callback<boolean | undefined>,
    ) => {
      if (
        !userManage.checkBrowserToken(
          browserId,
          req.access.desktopId,
          req.access.token,
        )
      ) {
        return callback(undefined);
      }

      const params = await shareApp.connectBrowserScreenOrAudio(
        browserId,
        req.access.desktopId,
        req.dtlsParameters,
        req.isAudio,
      );
      callback(params);
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
        return callback(undefined);
      }

      const params = await shareApp.establishBrowserScreen(
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
        return callback(undefined);
      }

      const params = await shareApp.establishBrowserAudio(
        browserId,
        req.access.desktopId,
        req.rtpCapabilities,
      );
      callback(params);
    },
  );
};
