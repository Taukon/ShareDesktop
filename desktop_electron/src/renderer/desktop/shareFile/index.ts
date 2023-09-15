import { Socket } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import { Buffer } from "buffer";
import { FileInfo, ReadFile, WriteFile } from "./type";
import { FileProducers } from "../mediasoup/type";
import {
  createDevice,
  createFileConsumer,
  createFileProducer,
  createFileWatchProducer,
  setAlreadyDevice,
} from "./connect";
import { FileWatchList, FileWatchMsg } from "../monitorFile/type";
import {
  endTransferFile,
  listenBroFileProducer,
  listenJoinFileWatch,
  listenTransfer,
  setFileProducer,
} from "../signaling/shareFile";
import {
  AppHeader,
  appMaxId,
  appStatus,
  getRandomInt,
  parseAppProtocol,
  usleep,
} from "../../../util";
import { createAppProtocol, createAppProtocolFromJson } from "../util";
import { updateFiles } from "../monitorFile";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.Buffer = Buffer;

export class ShareFile {
  public desktopId: string;
  public socket: Socket;

  private fileProducers: FileProducers = {};
  private device?: mediasoupClient.types.Device;

  constructor(desktopId: string, socket: Socket) {
    this.desktopId = desktopId;
    this.socket = socket;
  }

  public async startShareFile(
    dir: string,
    fileList: FileWatchList,
    alreadyDevice?: mediasoupClient.types.Device,
  ): Promise<boolean> {
    if (alreadyDevice) {
      console.log(`already have Device`);
      this.device = alreadyDevice;
      await setAlreadyDevice(this.socket, this.desktopId);
      return await this.loadFile(dir, fileList);
    } else {
      const device = await createDevice(this.socket, this.desktopId);
      this.device = device;
      return await this.loadFile(dir, fileList);
    }
  }

  private async loadFile(
    dir: string,
    fileList: FileWatchList,
  ): Promise<boolean> {
    if ((await window.shareFile.initFileWatch(dir)) && this.device) {
      const producer = await createFileWatchProducer(
        this.device,
        this.socket,
        this.desktopId,
      );
      if (producer?.readyState === "open") {
        window.shareFile.streamFileWatchMsg((data: FileWatchMsg) => {
          producer.send(JSON.stringify(data));
          updateFiles(fileList, data);
        });
        await window.shareFile.sendFileWatch(dir);
        listenJoinFileWatch(this.socket, dir);
      } else {
        producer?.on("open", async () => {
          window.shareFile.streamFileWatchMsg((data: FileWatchMsg) => {
            producer.send(JSON.stringify(data));
            updateFiles(fileList, data);
          });
          await window.shareFile.sendFileWatch(dir);
          listenJoinFileWatch(this.socket, dir);
        });
      }

      this.onFile(this.device, this.socket);
      return true;
    }
    return false;
  }

  private onFile(device: mediasoupClient.types.Device, socket: Socket) {
    const setTransfer = async (
      fileTransferId: string,
      browserId: string,
    ): Promise<void> => {
      const producer = await createFileProducer(device, socket, fileTransferId);

      if (producer?.readyState === "open") {
        setFileProducer(socket, fileTransferId, browserId);
        producer.on("close", () => {
          delete this.fileProducers[fileTransferId];
        });
        this.fileProducers[fileTransferId] = producer;
      } else if (producer) {
        producer.on("open", () => {
          setFileProducer(socket, fileTransferId, browserId);
          producer.on("close", () => {
            delete this.fileProducers[fileTransferId];
          });
          this.fileProducers[fileTransferId] = producer;
        });
      }
    };

    const setConsumer = async (fileTransferId: string) => {
      const consumer = await createFileConsumer(device, socket, fileTransferId);
      if (consumer) {
        // 同期
        const limit = 5;
        let count = 0;
        while (fileTransferId in this.fileProducers === false) {
          usleep(1 * 1000);
          count++;
          if (count > limit) {
            return endTransferFile(socket, fileTransferId);
          }
        }
        const producer = this.fileProducers[fileTransferId];

        if (consumer.readyState === "open") {
          await this.listenFileMsg(socket, fileTransferId, producer, consumer);
        } else {
          await this.listenFileMsg(socket, fileTransferId, producer, consumer);
        }
      }
    };

    listenTransfer(socket, setTransfer);
    listenBroFileProducer(socket, setConsumer);
  }

  private listenFileMsg = async (
    socket: Socket,
    fileTransferId: string,
    producer: mediasoupClient.types.DataProducer,
    consumer: mediasoupClient.types.DataConsumer,
  ): Promise<void> => {
    let writeInfo:
      | {
          fileName: string;
        }
      | undefined;

    consumer.on("message", async (appBuffer: ArrayBuffer) => {
      const parse = parseAppProtocol(Buffer.from(appBuffer));

      // recieve File
      if (writeInfo) {
        if (await this.writeFile(parse, writeInfo.fileName))
          endTransferFile(socket, fileTransferId);
        // delete this.fileProducers[fileTransferId];
      } else if (parse.status === appStatus.fileRequestWrite) {
        // UTF-8エンコードされたUint8Arrayを文字列にデコード
        const decoder = new TextDecoder("utf-8");
        const jsonString = decoder.decode(Uint8Array.from(parse.data));
        const data: WriteFile = JSON.parse(jsonString);
        const isSet = await window.shareFile.setFileInfo(
          data.fileName,
          data.fileSize,
        );
        if (isSet) {
          writeInfo = {
            fileName: data.fileName,
          };

          const id = getRandomInt(appMaxId);
          const appBuffer = createAppProtocol(
            Buffer.alloc(0),
            id,
            appStatus.fileAccept,
            0,
          );
          producer.send(appBuffer);
        }

        // TODO
        // send File
      } else if (parse.status === appStatus.fileRequestRead) {
        // UTF-8エンコードされたUint8Arrayを文字列にデコード
        const decoder = new TextDecoder("utf-8");
        const jsonString = decoder.decode(Uint8Array.from(parse.data));
        const data: ReadFile = JSON.parse(jsonString);
        const info = await window.shareFile.getFileInfo(data.fileName);

        if (info) {
          const fileInfo: FileInfo = {
            fileTransferId: fileTransferId,
            fileName: info.fileName,
            fileSize: info.fileSize,
          };
          const appBuffer = createAppProtocolFromJson(
            JSON.stringify(fileInfo),
            appStatus.fileAccept,
          );
          producer.send(appBuffer);

          this.readFile(
            fileInfo.fileName,
            fileInfo.fileSize,
            fileTransferId,
            producer,
          );
        }
      }
    });
  };

  private writeFile = async (
    parse: AppHeader,
    fileName: string,
  ): Promise<boolean> => {
    if (parse.status === appStatus.start) {
      await window.shareFile.recvFileBuffer(fileName, parse.data);
      return false;
    } else if (parse.status === appStatus.middle) {
      await window.shareFile.recvFileBuffer(fileName, parse.data);
      return false;
    } else if (parse.status === appStatus.end) {
      await window.shareFile.recvFileBuffer(fileName, parse.data);

      return true;
    }

    window.shareFile.destroyRecvFileBuffer(fileName);
    return true;
  };

  private readFile = async (
    fileName: string,
    fileSize: number,
    fileTransferId: string,
    producer: mediasoupClient.types.DataProducer,
  ): Promise<void> => {
    const id = getRandomInt(appMaxId);
    let order = 0;
    let total = 0;

    let chunk = await window.shareFile.getFileChunk(fileName, fileTransferId);
    while (chunk !== null) {
      total += chunk.byteLength;

      if (order === 0) {
        const appData = createAppProtocol(chunk, id, appStatus.start, order);
        producer.send(appData);
      } else if (total < fileSize) {
        const appData = createAppProtocol(chunk, id, appStatus.middle, order);
        producer.send(appData);
      } else {
        const appData = createAppProtocol(chunk, id, appStatus.end, order);
        producer.send(appData);
      }

      order++;
      chunk = await window.shareFile.getFileChunk(fileName, fileTransferId);
      usleep(1 * 1000);
    }
  };
}
