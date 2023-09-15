export type Signaling<T, U> = (params: T) => Promise<U>;

export type AuthInfo = {
  desktopId: string;
  password: string;
  browserId: string;
};
