import { type Server, type Socket } from "socket.io";
import { ShareApp } from "../serverShare/shareApp";
import { UserManage } from "../userManage";
import { ShareFile } from "../serverShare/shareFile";
import { signalingAppBrowser } from "./shareApp/browser";
import { signalingFileBrowser } from "./shareFile/browser";
import { signalingAppDesktop } from "./shareApp/desktop";
import { signalingFileDesktop } from "./shareFile/desktop";
import { AuthInfo, ClientInfo } from "./type";

export const signalingDesktop = (
  desktopServer: Server,
  clientServer: Server,
  socket: Socket,
  shareApp: ShareApp,
  shareFile: ShareFile,
  userManage: UserManage,
): void => {
  const desktopId = userManage.addDesktopUser(socket.id);
  socket.emit("desktopId", desktopId);

  socket.on("resAuth", async (res: { browserId: string; status: boolean }) => {
    const browserSocketId = userManage.getBrowserSocketId(res.browserId);

    if (res.status && browserSocketId) {
      const dropId = shareApp.verifyTotalBrowser();
      if (dropId) {
        const socketId = userManage.getDesktopUser(dropId)?.socketId;
        if (socketId) clientServer.to(socketId).emit("end");
      }

      const accessToken = userManage.createBrowserToken(
        res.browserId,
        desktopId,
      );
      if (accessToken) {
        clientServer.to(browserSocketId).emit("resAuth", {
          desktopId: desktopId,
          token: accessToken,
        });
      } else {
        clientServer.to(browserSocketId).emit("resAuth");
      }
    } else if (browserSocketId) {
      clientServer.to(browserSocketId).emit("resAuth");
    }
  });

  signalingAppDesktop(desktopServer, socket, shareApp, userManage);

  signalingFileDesktop(
    desktopServer,
    clientServer,
    socket,
    shareFile,
    userManage,
  );

  socket.on("disconnect", () => {
    userManage.removeDesktopUser(desktopId);
    shareApp.disconnectDesktop(desktopId);
    shareFile.disconnectDesktop(desktopId);
  });
};

export const signalingBrowser = (
  desktopServer: Server,
  socket: Socket,
  shareApp: ShareApp,
  shareFile: ShareFile,
  userManage: UserManage,
): void => {
  const browserId = userManage.addBrowserUser(socket.id);

  socket.on("reqAuth", (info: ClientInfo) => {
    const authInfo: AuthInfo = {
      desktopId: info.desktopId,
      password: info.password,
      browserId: browserId,
    };

    const desktopSocketId = userManage.getDesktopUser(info.desktopId)?.socketId;
    if (desktopSocketId && shareApp.isDesktopId(info.desktopId)) {
      desktopServer.to(desktopSocketId).emit("reqAuth", authInfo);
    } else {
      socket.emit("resAuth");
    }
  });

  signalingAppBrowser(desktopServer, socket, shareApp, userManage, browserId);
  signalingFileBrowser(desktopServer, socket, shareFile, userManage, browserId);

  socket.on("disconnect", () => {
    userManage.removeBrowserUser(browserId);
    shareApp.disconnectBrowser(browserId);
    shareFile.disconnectBrowser(browserId);
  });
};
