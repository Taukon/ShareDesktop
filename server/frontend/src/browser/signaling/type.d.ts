export type Signaling<T, U> = (params: T) => Promise<U>;

export type ClientInfo = {
  desktopId: string;
  password: string;
};

export type Access = {
  desktopId: string;
  token: string;
};
