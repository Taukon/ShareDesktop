import { desktop } from "../preload/desktop";
import { fileShare } from "../preload/fileShare";
import { util } from "../preload/util";

declare global {
  interface Window {
    // api: typeof controlObject;
    desktop: typeof desktop;
    fileShare: typeof fileShare;
    util: typeof util;
  }
}
