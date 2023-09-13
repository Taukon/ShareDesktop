export type DesktopId = string;
export type DesktopUser = {
  socketId: string;
};

export type DesktopUserList = {
  [desktopId: DesktopId]: DesktopUser;
};

export type BrowserId = string;
export type AccessToken = string;
export type BrowserUser = {
  socketId: string;
  [desktopId: DesktopId]: AccessToken;
};

export type BrowserUserList = {
  [browserId: string]: BrowserUserInfo;
};
