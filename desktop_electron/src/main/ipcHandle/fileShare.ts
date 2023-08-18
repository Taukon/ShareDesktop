import * as chokidar from "chokidar";
import { BrowserWindow } from "electron";
import { createReadStream, createWriteStream, statSync } from "fs";
// import * as path from "path";
import { FileMsgType, timer } from "../../util";
import { FileWatchMsg, WriteFileInfo } from "../../util/type";

export class FileShare {
  private watcher?: chokidar.FSWatcher;
  private path?: string;
  private dir?: string;
  private alreadyRun = false;
  private writeFileList: { [fileName: string]: WriteFileInfo | undefined } = {};
  private readingFile: { [fileName: string]: number | undefined } = {};

  private isWritingFile(fileName: string): boolean {
    return !!this.writeFileList[fileName];
  }

  private isUnlockReadStream(fileName: string): boolean {
    const readingFile = this.readingFile[fileName];
    if (typeof readingFile === "number" && readingFile > 0) {
      console.log(`locking read: ${fileName} | ${this.readingFile[fileName]}`);
      return false;
    }
    return true;
  }

  private lockReadStream(fileName: string) {
    const readingFile = this.readingFile[fileName];
    if (typeof readingFile === "number") {
      this.readingFile[fileName] = readingFile + 1;
    } else {
      this.readingFile[fileName] = 1;
    }
    console.log(`lock read: ${fileName} | ${this.readingFile[fileName]}`);
  }

  private unlockReadStream(fileName: string) {
    const endReadFile = this.readingFile[fileName];
    if (typeof endReadFile === "number") {
      this.readingFile[fileName] = endReadFile - 1;
      if (endReadFile - 1 === 0) {
        delete this.readingFile[fileName];
      }
    }
    console.log(`unlock read: ${fileName} | ${this.readingFile[fileName]}`);
  }

  // TODO
  private checkDirPath(dir: string): string | undefined {
    return `${__dirname}/${dir}`;
  }

  // TODO
  private checkFilePath(fileName: string): string | undefined {
    if (this.path) {
      const path = `${this.path}/${fileName}`;
      return path;
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

  public async sendStreamFile(
    fileName: string,
    fileTransferId: string,
    fileWindow: BrowserWindow,
  ): Promise<boolean> {
    const filePath = this.checkFilePath(fileName);
    if (filePath && !this.isWritingFile(fileName)) {
      this.lockReadStream(fileName);

      // const chunkSize = 16384;
      // const fileReadStream = createReadStream(`./dist/${fileName}`, {highWaterMark: chunkSize});
      const fileReadStream = createReadStream(filePath);

      for await (const chunk of fileReadStream) {
        // console.log(chunk.length);
        await timer(10);
        fileWindow.webContents.send("streamSendFileBuffer", {
          fileTransferId: fileTransferId,
          buf: chunk,
        });
      }
      fileReadStream.close();

      this.unlockReadStream(fileName);

      return true;
    }
    return false;
  }

  // TODO atomic
  public setFileInfo(fileName: string, fileSize: number): boolean {
    const filePath = this.checkFilePath(fileName);
    if (
      this.isUnlockReadStream(fileName) &&
      !this.isWritingFile(fileName) &&
      filePath
    ) {
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
      writeFileInfo.receivedSize += buffer.byteLength;
      writeFileInfo.stream.write(buffer);

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

  public initFileWatch(dir: string) {
    const path = this.checkDirPath(dir);
    if (path) {
      this.dir = dir;
      this.path = path;
      this.watcher = chokidar.watch(this.path, {
        ignored: /[\\/\\\\]\./,
        persistent: true,
        depth: 0,
      });
      this.alreadyRun = true;
      console.log(`watching Directory: ${this.path}`);
    }
  }

  public sendFilechange(fileWindow: BrowserWindow): boolean {
    if (this.watcher && this.alreadyRun && this.path) {
      this.watchChange(this.watcher, fileWindow, this.path);
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
        if (dirPath === this.path) {
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
        if (dirPath === this.path) {
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
      return this.watchlist(this.watcher, fileWindow);
    }
    return false;
  }

  private watchlist(
    watcher: chokidar.FSWatcher,
    fileWindow: BrowserWindow,
  ): boolean {
    const paths = watcher.getWatched();
    const pathNmames = Object.keys(paths);
    const targetPath = pathNmames[1];
    const targetDir = paths[pathNmames[0]][0];
    if (targetPath === this.path && targetDir === this.dir) {
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
      return true;
    }
    return false;
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
      this.dir = newDir;
      this.path = path;
      this.watcher = chokidar.watch(this.path, {
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
