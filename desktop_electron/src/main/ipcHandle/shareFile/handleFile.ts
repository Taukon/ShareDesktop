import * as chokidar from "chokidar";
import { BrowserWindow } from "electron";
import {
  createReadStream,
  createWriteStream,
  statSync,
  existsSync,
  ReadStream,
} from "fs";
// import * as path from "path";
import { FileMsgType, appHeader, appMax } from "../../../util";
import { FileWatchMsg, WriteFileInfo } from "../../../util/type";

export class HandleFile {
  private watcher?: chokidar.FSWatcher;
  private dirPath?: string;
  private alreadyRun = false;
  private writeFileList: { [fileName: string]: WriteFileInfo | undefined } = {};
  // private readingFile: { [fileName: string]: number | undefined } = {};
  private readingFile: {
    [fileName: string]: { [fileTransferId: string]: ReadStream };
  } = {};

  private isWritingFile(fileName: string): boolean {
    return !!this.writeFileList[fileName];
  }

  private isUnlockReadStream(fileName: string): boolean {
    if (Object.keys(this.readingFile[fileName]).length > 0) {
      console.log(`locking read: ${fileName} | ${this.readingFile[fileName]}`);
      return false;
    }
    return true;
  }

  private lockReadStream(
    fileName: string,
    fileTransferId: string,
    stream: ReadStream,
  ) {
    const streamList = this.readingFile[fileName];
    if (streamList) {
      streamList[fileTransferId] = stream;
    } else {
      this.readingFile[fileName] = {};
      this.readingFile[fileName][fileTransferId] = stream;
    }

    console.log(
      `lock read: ${fileName} | ${
        Object.keys(this.readingFile[fileName]).length
      }`,
    );
  }

  private haveReadStream(
    fileName: string,
    fileTransferId: string,
  ): ReadStream | undefined {
    const streamList = this.readingFile[fileName];
    if (streamList) {
      return streamList[fileTransferId] ?? undefined;
    }
    return undefined;
  }

  private unlockReadStream(fileName: string, fileTransferId: string) {
    const streamList = this.readingFile[fileName];
    if (streamList) {
      if (streamList[fileTransferId]) {
        delete streamList[fileTransferId];
      }
      if (Object.keys(streamList).length === 0) {
        delete this.readingFile[fileName];
      }
    }
    console.log(`unlock read: ${fileName} | ${this.readingFile[fileName]}`);
  }

  // TODO
  private checkDirPath(dirPath: string): string | undefined {
    if (existsSync(dirPath)) {
      return dirPath;
    }
    return undefined;
  }

  // TODO
  private checkFilePath(fileName: string): string | undefined {
    if (this.dirPath) {
      const path = `${this.dirPath}/${fileName}`;
      return existsSync(path) ? path : undefined;
    }
    return undefined;
  }

  public getFileInfo(
    fileName: string,
  ): { fileName: string; fileSize: number } | undefined {
    const filePath = this.checkFilePath(fileName);
    if (filePath && !this.isWritingFile(fileName)) {
      try {
        const stats = statSync(filePath);
        if (stats.isFile()) {
          const info = {
            fileName: fileName,
            fileSize: stats.size,
          };
          return info;
        }
      } catch (error) {
        console.log(error);
        return undefined;
      }
    }
    return undefined;
  }

  public async getReadStreamChunk(
    fileName: string,
    fileTransferId: string,
  ): Promise<Buffer | null> {
    const filePath = this.checkFilePath(fileName);
    const fileSize = this.getFileInfo(fileName)?.fileSize;
    if (filePath && fileSize && !this.isWritingFile(fileName)) {
      const stream = this.haveReadStream(fileName, fileTransferId);
      if (stream === undefined) {
        const chunkSize = appMax - appHeader;
        const fileReadStream = createReadStream(filePath, {
          highWaterMark: chunkSize,
        });

        this.lockReadStream(fileName, fileTransferId, fileReadStream);

        // https://nodejs.org/api/stream.html#readablereadsize
        const chunk: Buffer | null = fileReadStream.read();
        console.log(`chunk ${chunk}`);
        if (!chunk) {
          fileReadStream.close();
          this.unlockReadStream(fileName, fileTransferId);
        }

        return chunk;
      }

      const chunk: Buffer | null = stream.read();

      if (!chunk) {
        stream.close();
        this.unlockReadStream(fileName, fileTransferId);
      }

      return chunk;
    }
    return null;
  }

  // TODO atomic
  public setFileInfo(fileName: string, fileSize: number): boolean {
    const filePath = `${this.dirPath}/${fileName}`;
    console.log(`set: ${filePath}`);
    if (this.isUnlockReadStream(fileName) && !this.isWritingFile(fileName)) {
      const fileWriteStream = createWriteStream(filePath);
      if (fileSize === 0) {
        fileWriteStream.end();
        return false;
      }

      this.writeFileList[fileName] = {
        stream: fileWriteStream,
        size: fileSize,
        receivedSize: 0,
      };
      return true;
    }

    return false;
  }

  // TODO atomic
  public recvStreamFile(
    fileName: string,
    buffer: Uint8Array,
    fileWindow: BrowserWindow,
  ): number {
    const writeFileInfo = this.writeFileList[fileName];
    if (writeFileInfo) {
      const data = Buffer.from(buffer);
      writeFileInfo.stream.write(data);
      writeFileInfo.receivedSize += data.byteLength;

      if (writeFileInfo.receivedSize === writeFileInfo.size) {
        writeFileInfo.stream.end();
        writeFileInfo.stream.destroy();
        delete this.writeFileList[fileName];

        if (this.watcher) {
          const msg: FileWatchMsg = {
            msgType: FileMsgType.saved,
            msgItems: [fileName],
          };
          fileWindow.webContents.send("streamFileWatchMessage", msg);
        }

        return writeFileInfo.receivedSize;
      }
      return writeFileInfo.receivedSize;
    }
    return 0;
  }

  public destroyRecvStreamFile(fileName: string): boolean {
    const writeFileInfo = this.writeFileList[fileName];
    if (writeFileInfo) {
      console.log(`cannot recieve file: ${fileName}`);
      writeFileInfo.stream.end();
      writeFileInfo.stream.destroy();
      delete this.writeFileList[fileName];
      return true;
    }
    return false;
  }

  public initFileWatch(dirPath: string): boolean {
    const path = this.checkDirPath(dirPath);
    if (path) {
      this.dirPath = path;
      this.watcher = chokidar.watch(this.dirPath, {
        ignored: /[\\/\\\\]\./,
        persistent: true,
        depth: 0,
      });
      this.alreadyRun = true;
      console.log(`watching Directory: ${this.dirPath}`);
      return true;
    }
    return false;
  }

  public sendFilechange(fileWindow: BrowserWindow): boolean {
    if (this.watcher && this.alreadyRun && this.dirPath) {
      this.watchChange(this.watcher, fileWindow, this.dirPath);
      return true;
    }
    return false;
  }

  private watchChange(
    watcher: chokidar.FSWatcher,
    fileWindow: BrowserWindow,
    basePath: string,
  ) {
    watcher.on("ready", () => {
      watcher.on("add", (path) => {
        const dirPath = path.slice(0, basePath.length);
        if (dirPath === basePath) {
          const fileName = path.slice(basePath.length + 1);
          console.log(`added : ${fileName}`);

          if (!this.isWritingFile(fileName)) {
            const msg: FileWatchMsg = {
              msgType: FileMsgType.add,
              msgItems: [fileName],
            };
            fileWindow.webContents.send("streamFileWatchMessage", msg);
          }
        }
      });
      watcher.on("change", (path) => {
        const dirPath = path.slice(0, basePath.length);
        if (dirPath === this.dirPath) {
          const fileName = path.slice(basePath.length + 1);

          if (this.isWritingFile(fileName)) {
            // console.log(`writing file: ${fileName}`);
            const msg: FileWatchMsg = {
              msgType: FileMsgType.writing,
              msgItems: [fileName],
            };
            fileWindow.webContents.send("streamFileWatchMessage", msg);
          } else {
            console.log(`changed ${fileName}`);
          }
        }
      });
      watcher.on("unlink", (path) => {
        const dirPath = path.slice(0, basePath.length);
        if (dirPath === this.dirPath) {
          const fileName = path.slice(basePath.length + 1);
          console.log(`unlink : ${fileName}`);
          const msg: FileWatchMsg = {
            msgType: FileMsgType.unlink,
            msgItems: [fileName],
          };
          fileWindow.webContents.send("streamFileWatchMessage", msg);
        }
      });
    });
  }

  public sendFilelist(fileWindow: BrowserWindow, dir: string): boolean {
    if (this.watcher && this.alreadyRun && this.checkDirPath(dir)) {
      this.watchlist(this.watcher, fileWindow);
      return true;
    }
    return false;
  }

  private watchlist(
    watcher: chokidar.FSWatcher,
    fileWindow: BrowserWindow,
  ): void {
    const paths = watcher.getWatched();
    const pathNmames = Object.keys(paths);
    const targetPath =
      `${pathNmames[0]}/${paths[pathNmames[0]][0]}` === pathNmames[1]
        ? pathNmames[1]
        : pathNmames[0];

    const lists = paths[targetPath];
    const sendlists: string[] = [];
    for (const item of lists) {
      if (!paths[`${targetPath}/${item}`]) {
        sendlists.push(item);
      }
    }
    console.log(sendlists);
    const msg: FileWatchMsg = {
      msgType: FileMsgType.list,
      msgItems: sendlists,
    };
    fileWindow.webContents.send("streamFileWatchMessage", msg);
  }

  private async close(): Promise<boolean> {
    if (this.watcher && this.alreadyRun) {
      await this.watcher.close();
      this.alreadyRun = false;
      return true;
    }
    return false;
  }

  public async changePath(newDir: string): Promise<boolean> {
    const path = this.checkDirPath(newDir);
    if ((await this.close()) && path) {
      this.dirPath = path;
      this.watcher = chokidar.watch(this.dirPath, {
        ignored: /[\\/\\\\]\./,
        persistent: true,
        depth: 0,
      });
      this.alreadyRun = true;
      return true;
    }
    return false;
  }
}
