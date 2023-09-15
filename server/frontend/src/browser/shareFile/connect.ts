import * as mediasoupClient from "mediasoup-client";
import { Socket } from "socket.io-client";
import streamSaver from "streamsaver";
import { loadDevice, setDataConsumer, setDataProducer } from "../mediasoup";
import { Access } from "../signaling/type";
import {
  appHeader,
  appMax,
  appMaxId,
  appStatus,
  createAppProtocol,
  createAppProtocolFromJson,
  getRandomInt,
  parseAppProtocol,
  timer,
} from "../util";
import {
  connectBrowserFileWatch,
  connectRecvFile,
  connectSendFile,
  createBrowserFileWatch,
  createRecvFile,
  createSendFile,
  endTransferFile,
  establishBrowserFileWatch,
  establishRecvFile,
  establishSendFile,
  getRtpCapFile,
} from "../signaling/shareFile";
import { FileInfo, ReadFile, WriteFile, WriteInfo } from "./type";

export const createDevice = async (
  socket: Socket,
  access: Access,
): Promise<mediasoupClient.types.Device | undefined> => {
  const forDevice = getRtpCapFile(socket, access);
  const device = await loadDevice(forDevice);
  return device;
};

export const setAlreadyDevice = async (
  socket: Socket,
  access: Access,
): Promise<boolean> => {
  const forAlreadyDevice = getRtpCapFile(socket, access);
  const notUse = await forAlreadyDevice();
  if (notUse) {
    return true;
  } else {
    return false;
  }
};

// ------- FileWatch
export const setFileWatch = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  access: Access,
): Promise<mediasoupClient.types.DataConsumer | undefined> => {
  const forTransport = createBrowserFileWatch(socket, access);
  const forConnect = connectBrowserFileWatch(socket, access);
  const forConsumeData = establishBrowserFileWatch(socket, access);
  const consumer = await setDataConsumer(
    device,
    forTransport,
    forConnect,
    forConsumeData,
  );

  return consumer;
};

export const createFileProducer = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  fileTransferId: string,
): Promise<mediasoupClient.types.DataProducer | undefined> => {
  const forTransport = createSendFile(socket, fileTransferId);
  const forConnect = connectSendFile(socket, fileTransferId);
  const forProduceData = establishSendFile(socket, fileTransferId);
  const producer = await setDataProducer(
    device,
    forTransport,
    forConnect,
    forProduceData,
  );

  return producer;
};

const reqWriteFile = async (
  producer: mediasoupClient.types.DataProducer,
  writeFile: WriteFile,
): Promise<void> => {
  const jsonString = JSON.stringify(writeFile);
  const data = createAppProtocolFromJson(
    jsonString,
    appStatus.fileRequestWrite,
  );
  producer.send(data);
};

export const sendFile = async (
  producer: mediasoupClient.types.DataProducer,
  consumer: mediasoupClient.types.DataConsumer,
  writeInfo: WriteInfo,
): Promise<void> => {
  if (consumer.readyState === "open") {
    consumer.on("message", async (msg) => {
      const parse = parseAppProtocol(new Uint8Array(msg));
      if (parse.status === appStatus.fileAccept) {
        await sendFileBuffer(
          producer,
          writeInfo.fileReader,
          writeInfo.fileSize,
        );
      }
    });
    reqWriteFile(producer, {
      fileName: writeInfo.fileName,
      fileSize: writeInfo.fileSize,
    });
  } else {
    consumer.on("open", () => {
      consumer.on("message", async (msg) => {
        const parse = parseAppProtocol(new Uint8Array(msg));
        if (parse.status === appStatus.fileAccept) {
          await sendFileBuffer(
            producer,
            writeInfo.fileReader,
            writeInfo.fileSize,
          );
        }
      });
      reqWriteFile(producer, {
        fileName: writeInfo.fileName,
        fileSize: writeInfo.fileSize,
      });
    });
  }
};

const sendFileBuffer = async (
  producer: mediasoupClient.types.DataProducer,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  fileSize: number,
): Promise<void> => {
  const id = getRandomInt(appMaxId);
  const chunkSize = appMax - appHeader;
  let order = 0;
  let total = 0;
  try {
    // eslint-disable-next-line no-constant-condition
    while (1) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value.byteLength > chunkSize) {
        let sliceOffset = 0;
        console.log(`Buffer Size Over`);
        while (sliceOffset < value.byteLength) {
          const sliceBuf = value.slice(sliceOffset, sliceOffset + chunkSize);

          total += sliceBuf.byteLength;
          if (order === 0) {
            const appData = createAppProtocol(
              sliceBuf,
              id,
              appStatus.start,
              order,
            );
            producer.send(appData);
          } else if (total < fileSize) {
            const appData = createAppProtocol(
              sliceBuf,
              id,
              appStatus.middle,
              order,
            );
            producer.send(appData);
          } else {
            const appData = createAppProtocol(
              sliceBuf,
              id,
              appStatus.end,
              order,
            );
            producer.send(appData);
          }

          sliceOffset += sliceBuf.byteLength;
          order++;
          await timer(10);
        }
      } else {
        total += value.byteLength;
        if (order === 0) {
          const appData = createAppProtocol(value, id, appStatus.start, order);
          producer.send(appData);
        } else if (total < fileSize) {
          const appData = createAppProtocol(value, id, appStatus.middle, order);
          producer.send(appData);
        } else {
          const appData = createAppProtocol(value, id, appStatus.end, order);
          producer.send(appData);
        }

        order++;
        await timer(100);
      }
    }
    reader.releaseLock();
  } catch (error) {
    console.log(`closed transport`);
    console.log(error);
  }
};

export const createFileConsumer = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  fileTransferId: string,
): Promise<mediasoupClient.types.DataConsumer | undefined> => {
  const forTransport = createRecvFile(socket, fileTransferId);
  const forConnect = connectRecvFile(socket, fileTransferId);
  const forConsumeData = establishRecvFile(socket, fileTransferId);
  const consumer = await setDataConsumer(
    device,
    forTransport,
    forConnect,
    forConsumeData,
  );

  return consumer;
};

export const receiveFile = (
  producer: mediasoupClient.types.DataProducer,
  consumer: mediasoupClient.types.DataConsumer,
  socket: Socket,
  fileName: string,
): void => {
  if (consumer.readyState === "open") {
    readFile(producer, consumer, socket);
    reqReadFile(producer, { fileName });
  } else {
    consumer.on("open", () => {
      readFile(producer, consumer, socket);
      reqReadFile(producer, { fileName });
    });
  }
};

const reqReadFile = async (
  producer: mediasoupClient.types.DataProducer,
  readFile: ReadFile,
): Promise<void> => {
  const jsonString = JSON.stringify(readFile);
  const data = createAppProtocolFromJson(jsonString, appStatus.fileRequestRead);
  producer.send(data);
};

//TODO 再送制御
const readFile = async (
  openProducer: mediasoupClient.types.DataProducer,
  openConsumer: mediasoupClient.types.DataConsumer,
  socket: Socket,
): Promise<void> => {
  let receivedSize = 0;

  let stamp = 0;
  let checkStamp = 0;
  let limit = 3;
  let isClosed = false;

  let fileInfo: FileInfo | undefined;
  let writer: WritableStreamDefaultWriter | undefined;

  openConsumer.on("message", (msg: ArrayBuffer) => {
    const parse = parseAppProtocol(new Uint8Array(msg));

    if (parse.status === appStatus.fileAccept) {
      // UTF-8エンコードされたUint8Arrayを文字列にデコード
      const decoder = new TextDecoder("utf-8");
      const jsonString = decoder.decode(Uint8Array.from(parse.data));
      const info: FileInfo = JSON.parse(jsonString);
      fileInfo = info;

      const fileStream = streamSaver.createWriteStream(info.fileName, {
        size: info.fileSize,
      });

      writer = fileStream.getWriter();
      if (receivedSize === info.fileSize) {
        writer.close();
        endTransferFile(socket, info.fileTransferId);
        return;
      }
    } else if (parse.status === appStatus.fileError) {
      openConsumer.close();
      openProducer.close();
      if (fileInfo) endTransferFile(socket, fileInfo.fileTransferId);
    } else if (fileInfo && writer) {
      stamp++;
      receivedSize += parse.data.byteLength;
      writer.write(parse.data);
      // console.log(
      //   `${
      //     fileInfo.fileSize - receivedSize
      //   } | receivedSize: ${receivedSize} | fileSize: ${fileInfo.fileSize}`,
      // );
      if (receivedSize === fileInfo.fileSize) {
        isClosed = true;
        writer.close();
        openConsumer.close();
        openProducer.close();
        endTransferFile(socket, fileInfo.fileTransferId);
      }
    }
  });

  // eslint-disable-next-line no-constant-condition
  while (1) {
    await timer(2 * 1000);
    if (fileInfo && writer) {
      if (isClosed) break;
      if (stamp === checkStamp) {
        limit--;
        if (limit == 0) {
          console.log(`timeout recieve file: ${fileInfo.fileName}`);
          writer.abort();

          endTransferFile(socket, fileInfo.fileTransferId);
          break;
        }
      } else {
        checkStamp = stamp;
      }
    }
  }
};
