import * as mediasoupClient from "mediasoup-client";
import { Socket } from "socket.io-client";
import streamSaver from "streamsaver";
import { setConsumer, setDataConsumer, setDataProducer } from "./mediasoup";
import {
  connectBrowserFileWatch,
  connectMediaAudio,
  connectMediaControl,
  connectMediaScreen,
  connectRecvFile,
  connectSendFile,
  createBrowserFileWatch,
  createMediaAudio,
  createMediaControl,
  createMediaScreen,
  createRecvFile,
  createSendFile,
  establishBrowserFileWatch,
  establishMediaAudio,
  establishMediaControl,
  establishMediaScreen,
  establishRecvFile,
  establishSendFile,
  setFileConsumer,
  waitSetFileConsumer,
} from "./signaling";
import { Access, FileInfo } from "./signaling/type";
import { controlEventListener } from "./canvas";
import {
  appHeader,
  appMax,
  appMaxId,
  appStatus,
  appendBuffer,
  createAppProtocol,
  getRandomInt,
  parseAppProtocol,
  timer,
} from "./util";
import { removeFileList, updateFiles } from "./fileShare";
import { FileDownload, FileWatchMsg } from "./fileShare/type";

// -------- Control

export const setControl = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  access: Access,
  canvas: HTMLCanvasElement,
): Promise<mediasoupClient.types.DataProducer | undefined> => {
  const forTransport = createMediaControl(socket, access);
  const forConnect = connectMediaControl(socket, access);
  const forProduceData = establishMediaControl(socket, access);

  const producer = await setDataProducer(
    device,
    forTransport,
    forConnect,
    forProduceData,
  );

  if (producer?.readyState === "open") {
    controlEventListener(canvas, producer);
  } else if (producer) {
    producer.on("open", () => {
      controlEventListener(canvas, producer);
    });
  }

  return producer;
};

// ------- Screen
export const setScreen = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  access: Access,
  image: HTMLImageElement,
): Promise<mediasoupClient.types.DataConsumer | undefined> => {
  const forTransport = createMediaScreen(socket, access);
  const forConnect = connectMediaScreen(socket, access);
  const forConsumeData = establishMediaScreen(socket, access);
  const consumer = await setDataConsumer(
    device,
    forTransport,
    forConnect,
    forConsumeData,
  );

  if (consumer?.readyState === "open") {
    reflectScreen(consumer, image);
  } else if (consumer) {
    consumer.on("open", () => {
      reflectScreen(consumer, image);
    });
  }

  return consumer;
};

const reflectScreen = (
  consumer: mediasoupClient.types.DataConsumer,
  image: HTMLImageElement,
): void => {
  let preId: number;
  let order: number = 0;
  let tmp: Uint8Array;

  consumer.on("message", (buf) => {
    const parse = parseAppProtocol(new Uint8Array(buf));
    if (parse.status === appStatus.once) {
      const imgBase64 = btoa(
        new Uint8Array(parse.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );
      image.src = "data:image/jpeg;base64," + imgBase64;
    } else if (parse.status === appStatus.start) {
      tmp = parse.data;
      preId = parse.id;
      order = parse.order + 1;
    } else if (
      parse.status === appStatus.middle &&
      parse.id === preId &&
      parse.order === order
    ) {
      tmp = appendBuffer(tmp, parse.data);
      order++;
    } else if (
      parse.status === appStatus.end &&
      parse.id === preId &&
      parse.order === order
    ) {
      tmp = appendBuffer(tmp, parse.data);
      const imgBase64 = btoa(
        new Uint8Array(tmp).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );
      image.src = "data:image/jpeg;base64," + imgBase64;
      tmp = new Uint8Array(0);
      order = 0;
    } else {
      order = 0;
      tmp = new Uint8Array(0);
    }
  });
};

// ------- Audio
export const setAudio = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  access: Access,
  audio: HTMLAudioElement,
): Promise<mediasoupClient.types.Consumer | undefined> => {
  const forTransport = createMediaAudio(socket, access);
  const forConnect = connectMediaAudio(socket, access);
  const forConsume = establishMediaAudio(
    socket,
    access,
    device.rtpCapabilities,
  );
  const consumer = await setConsumer(
    device,
    forTransport,
    forConnect,
    forConsume,
  );

  if (consumer) {
    //console.log("get audio");
    const { track } = consumer;
    audio.srcObject = new MediaStream([track]);
  }

  return consumer;
};

// ------- FileWatch
export const setFileWatch = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  access: Access,
  fileDownload: FileDownload,
  recvFileFunc: (fileName: string) => Promise<void>,
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

  if (consumer?.readyState === "open") {
    consumer.on("close", () => {
      removeFileList(fileDownload);
    });

    consumer.on("message", (msg) => {
      const data: FileWatchMsg = JSON.parse(msg);
      updateFiles(fileDownload, data, recvFileFunc);
    });
    socket.emit("requestFileWatch", access);
  } else if (consumer) {
    consumer.on("close", () => {
      removeFileList(fileDownload);
    });

    consumer.on("open", () => {
      consumer.on("message", (msg) => {
        const data: FileWatchMsg = JSON.parse(msg);
        updateFiles(fileDownload, data, recvFileFunc);
      });
      socket.emit("requestFileWatch", access);
    });
  }

  return consumer;
};

// ----- SendFile
export const setSendFile = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  fileInfo: FileInfo,
  fileStream: ReadableStream<Uint8Array>,
): Promise<mediasoupClient.types.DataProducer | undefined> => {
  const forTransport = createSendFile(socket, fileInfo.fileTransferId);
  const forConnect = connectSendFile(socket, fileInfo.fileTransferId);
  const forProduceData = establishSendFile(socket, fileInfo.fileTransferId);
  const producer = await setDataProducer(
    device,
    forTransport,
    forConnect,
    forProduceData,
  );

  const reader = fileStream.getReader();
  if (producer) {
    producer.on("close", () => {
      reader.releaseLock();
      fileStream.cancel();
    });

    const status = await WaitFileConsumer(socket, fileInfo);
    if (status === fileInfo.fileTransferId) {
      if (producer.readyState === "open") {
        await sendFile(producer, reader, fileInfo.fileSize);
      } else {
        producer.on("open", async () => {
          await sendFile(producer, reader, fileInfo.fileSize);
        });
      }
    }
  }

  return producer;
};

export const WaitFileConsumer = async (
  socket: Socket,
  fileInfo: FileInfo,
): Promise<string> => {
  const onReady = waitSetFileConsumer(socket, fileInfo);
  return await onReady();
};

const sendFile = async (
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
        await timer(10);
      }
    }
    reader.releaseLock();
  } catch (error) {
    console.log(`closed transport`);
    console.log(error);
  }
};

// ----- RecvFile
export const setRecvFile = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  fileInfo: FileInfo,
): Promise<mediasoupClient.types.DataConsumer | undefined> => {
  const forTransport = createRecvFile(socket, fileInfo.fileTransferId);
  const forConnect = connectRecvFile(socket, fileInfo.fileTransferId);
  const forConsumeData = establishRecvFile(socket, fileInfo.fileTransferId);
  const consumer = await setDataConsumer(
    device,
    forTransport,
    forConnect,
    forConsumeData,
  );

  if (consumer?.readyState === "open") {
    receiveFile(consumer, socket, fileInfo);
    setFileConsumer(socket, fileInfo.fileTransferId);
  } else if (consumer) {
    consumer.on("open", () => {
      receiveFile(consumer, socket, fileInfo);
      setFileConsumer(socket, fileInfo.fileTransferId);
    });
  }

  return consumer;
};

const receiveFile = async (
  consumer: mediasoupClient.types.DataConsumer,
  socket: Socket,
  fileInfo: FileInfo,
): Promise<void> => {
  let receivedSize = 0;

  let stamp = 0;
  let checkStamp = 0;
  let limit = 3;
  let isClosed = false;

  const fileStream = streamSaver.createWriteStream(fileInfo.fileName, {
    size: fileInfo.fileSize,
  });

  const writer = fileStream.getWriter();
  if (receivedSize === fileInfo.fileSize) {
    writer.close();
    socket.emit("endTransferFile", fileInfo.fileTransferId);
    return;
  }

  consumer.on("message", (msg: ArrayBuffer) => {
    stamp++;
    const parse = parseAppProtocol(new Uint8Array(msg));
    receivedSize += parse.data.byteLength;
    writer.write(parse.data);

    if (receivedSize === fileInfo.fileSize) {
      isClosed = true;
      writer.close();
      socket.emit("endTransferFile", fileInfo.fileTransferId);
    }
  });

  // eslint-disable-next-line no-constant-condition
  while (1) {
    await timer(2 * 1000);
    if (isClosed) break;
    if (stamp === checkStamp) {
      limit--;
      if (limit == 0) {
        console.log(`timeout recieve file: ${fileInfo.fileName}`);
        writer.abort();
        socket.emit("endTransferFile", fileInfo.fileTransferId);
        break;
      }
    } else {
      checkStamp = stamp;
    }
  }
};
