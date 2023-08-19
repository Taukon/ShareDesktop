import { contextBridge } from "electron";
import { desktop } from "./desktop";
import { fileShare } from "./fileShare";
import { util } from "./util";

contextBridge.exposeInMainWorld("desktop", desktop);
contextBridge.exposeInMainWorld("fileShare", fileShare);
contextBridge.exposeInMainWorld("util", util);
