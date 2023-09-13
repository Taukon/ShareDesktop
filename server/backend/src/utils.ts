import * as crypto from "crypto";

export const getRandomId = (): string => {
  const S = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  return Array.from(crypto.getRandomValues(new Uint32Array(10)))
    .map((v) => S[v % S.length])
    .join("");
};
