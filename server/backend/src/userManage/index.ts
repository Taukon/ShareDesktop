import { getRandomId } from "../utils";
import {
  AccessToken,
  BrowserId,
  BrowserUserList,
  DesktopId,
  DesktopUser,
  DesktopUserList,
} from "./manage";

export class UserManage {
  private desktopUser: DesktopUserList = {};
  private browserUser: BrowserUserList = {};

  public addDesktopUser(socketId: string): DesktopId {
    const desktopId = socketId;
    this.desktopUser[desktopId] = { socketId: socketId };
    return desktopId;
  }

  public getDesktopUser(desktopId: string): DesktopUser | undefined {
    const desktopUser = this.desktopUser[desktopId];
    return desktopUser;
  }

  public removeDesktopUser(desktopId: string): void {
    if (this.desktopUser[desktopId]) delete this.desktopUser[desktopId];
  }

  public addBrowserUser(socketId: string): BrowserId {
    const browserId = socketId;
    this.browserUser[browserId] = { socketId: socketId };
    return browserId;
  }

  public createBrowserToken(
    browserId: string,
    desktopId: string,
  ): AccessToken | undefined {
    if (this.browserUser[browserId]) {
      const token = getRandomId();
      this.browserUser[browserId][desktopId] = token;
      return token;
    }
    return undefined;
  }

  public getBrowserSocketId(browserId: string): string {
    return this.browserUser[browserId]?.socketId;
  }

  private getBrowserToken(
    browserId: string,
    desktopId: string,
  ): AccessToken | undefined {
    const browserUser = this.browserUser[browserId];
    if (browserUser) {
      const token = browserUser[desktopId];
      return token;
    }
    return undefined;
  }

  public removeBrowserUser(browserId: string): void {
    if (this.browserUser[browserId]) delete this.browserUser[browserId];
  }

  public checkBrowserToken(
    browserId: string,
    desktopId: string,
    token: string,
  ): boolean {
    return this.getBrowserToken(browserId, desktopId) === token;
  }
}
