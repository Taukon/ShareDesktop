import { Socket } from "socket.io-client";
import { Device } from "mediasoup-client";
import { Access } from "../signaling/type";
import { FileDownload, FileUpload, FileWatchMsg } from "../monitorFile/type";
import {
  createDevice,
  createFileConsumer,
  createFileProducer,
  receiveFile,
  sendFile,
  setFileWatch,
} from "./connect";
import {
  // endTransferFile,
  listenDtpFileProducer,
  requestTransfer,
  sendJoinFileWatch,
  setFileWebProducer,
} from "../signaling/shareFile";
import { FileProducerInfo, FileProducerList, WriteInfoList } from "./type";
// import { usleep } from "../util";
import { removeFileList, updateFiles } from "../monitorFile";
import { DataProducer } from "mediasoup-client/lib/types";

export class ShareFile {
  public desktopId: string;

  public fileUpload?: FileUpload;
  public fileDownload?: FileDownload;
  public device?: Device;
  private fileProducers: FileProducerList = {};
  private writeFileList: WriteInfoList = {};

  constructor(desktopId: string) {
    this.desktopId = desktopId;
  }

  public async startShareFile(
    socket: Socket,
    access: Access,
    alreadyDevice?: Device,
  ): Promise<Device | undefined> {
    if (alreadyDevice) {
      console.log(`already have Device`);
      this.device = alreadyDevice;
      await this.loadShareFile(socket, access, alreadyDevice);
      return alreadyDevice;
    } else {
      const device = await createDevice(socket, access);
      if (device) {
        this.device = device;
        await this.loadShareFile(socket, access, device);
        return device;
      }
    }
    return undefined;
  }

  private async loadShareFile(
    socket: Socket,
    access: Access,
    device: Device,
  ): Promise<void> {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    // input.name = 'files[]'; // 複数ファイル対応のために[]を追加
    const uploadButton = document.createElement("button");
    uploadButton.textContent = "send";

    this.fileUpload = {
      input: fileInput,
      button: uploadButton,
    };
    this.fileDownload = document.createElement("div");

    const result = await this.startFileWatch(
      device,
      socket,
      access,
      this.fileDownload,
    );
    if (result) {
      this.initSendFile(this.fileUpload, device, socket, access);
    }
  }

  private async startFileWatch(
    device: Device,
    socket: Socket,
    access: Access,
    fileDownload: FileDownload,
  ): Promise<boolean> {
    const recvFileFunc = async (fileName: string) => {
      await this.initRecvFile(device, socket, access, fileName);
    };
    const consumer = await setFileWatch(device, socket, access);

    if (consumer?.readyState === "open") {
      consumer.on("close", () => {
        removeFileList(fileDownload);
      });
      consumer.on("message", (msg) => {
        const data: FileWatchMsg = JSON.parse(msg);
        updateFiles(fileDownload, data, recvFileFunc);
      });
      sendJoinFileWatch(socket, access);
    } else if (consumer) {
      consumer.on("open", () => {
        consumer.on("close", () => {
          removeFileList(fileDownload);
        });
        consumer.on("message", (msg) => {
          const data: FileWatchMsg = JSON.parse(msg);
          updateFiles(fileDownload, data, recvFileFunc);
        });
        sendJoinFileWatch(socket, access);
      });
    }

    listenDtpFileProducer(socket, async (fileTransferId: string) => {
      const consumer = await createFileConsumer(device, socket, fileTransferId);

      if (consumer) {
        const fileProducerInfo = this.fileProducers[
          fileTransferId
        ] as FileProducerInfo;
        const producer = fileProducerInfo.producer;
        const fileName = fileProducerInfo.fileName;
        const type = fileProducerInfo.type;
        const writeInfo = this.writeFileList[fileTransferId];

        if (type === "write" && writeInfo) {
          sendFile(producer, consumer, writeInfo);
        } else if (type === "read") {
          receiveFile(producer, consumer, socket, fileName);
        }
      }
    });

    return consumer ? true : false;
  }

  private async initRecvFile(
    device: Device,
    socket: Socket,
    access: Access,
    fileName: string,
  ): Promise<void> {
    const reqTransfer = requestTransfer(socket, access);
    const fileTransferId = await reqTransfer();
    if (fileTransferId) {
      const producer = await createFileProducer(device, socket, fileTransferId);

      if (producer?.readyState === "open") {
        producer.on("close", () => {
          delete this.fileProducers[fileTransferId];
        });
        this.fileProducers[fileTransferId] = {
          producer,
          fileName,
          type: "read",
        };
        setFileWebProducer(socket, fileTransferId, access);
      } else if (producer) {
        producer.on("open", () => {
          producer.on("close", () => {
            delete this.fileProducers[fileTransferId];
          });
          this.fileProducers[fileTransferId] = {
            producer,
            fileName,
            type: "read",
          };
          setFileWebProducer(socket, fileTransferId, access);
        });
      }
    }
  }

  private initSendFile(
    fileUpload: FileUpload,
    device: Device,
    socket: Socket,
    access: Access,
  ) {
    fileUpload.button.addEventListener("click", () => {
      if (fileUpload.input.files) {
        for (let i = 0; i < fileUpload.input.files.length; i++) {
          const fileName = fileUpload.input.files.item(i)?.name;
          const fileSize = fileUpload.input.files.item(i)?.size;
          const fileStream = fileUpload.input.files.item(i)?.stream();
          if (fileName && fileSize && fileStream) {
            // console.log(`file name: ${fileName} | size: ${fileSize}`);
            this.startSendFile(
              device,
              socket,
              access,
              fileName,
              fileSize,
              fileStream,
            );
          }
        }
      } else {
        console.log(`nothing`);
      }
    });
  }

  private setWriteFile(
    socket: Socket,
    access: Access,
    openProducer: DataProducer,
    fileTransferId: string,
    fileName: string,
    fileSize: number,
    fileStream: ReadableStream<Uint8Array>,
  ): void {
    const fileReader = fileStream.getReader();
    openProducer.on("close", () => {
      fileReader.releaseLock();
      fileStream.cancel();
      delete this.fileProducers[fileTransferId];
      delete this.writeFileList[fileTransferId];
    });
    this.fileProducers[fileTransferId] = {
      producer: openProducer,
      fileName,
      type: "write",
    };
    this.writeFileList[fileTransferId] = { fileName, fileSize, fileReader };
    setFileWebProducer(socket, fileTransferId, access);
  }

  private async startSendFile(
    device: Device,
    socket: Socket,
    access: Access,
    fileName: string,
    fileSize: number,
    fileStream: ReadableStream<Uint8Array>,
  ): Promise<void> {
    const reqTransfer = requestTransfer(socket, access);
    const fileTransferId = await reqTransfer();
    if (fileTransferId) {
      const producer = await createFileProducer(device, socket, fileTransferId);
      if (producer?.readyState === "open") {
        this.setWriteFile(
          socket,
          access,
          producer,
          fileTransferId,
          fileName,
          fileSize,
          fileStream,
        );
      } else if (producer) {
        producer.on("open", () => {
          this.setWriteFile(
            socket,
            access,
            producer,
            fileTransferId,
            fileName,
            fileSize,
            fileStream,
          );
        });
      }
    }
  }
}
