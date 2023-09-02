import { Socket } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import {
  connectDesktopControl,
  connectDesktopFileWatch,
  connectDesktopScreen,
  connectRecvFile,
  connectSendFile,
  createDesktopControl,
  createDesktopFileWatch,
  createDesktopScreen,
  createRecvFile,
  createSendFile,
  establishDesktopAudio,
  establishDesktopControl,
  establishDesktopFileWatch,
  establishDesktopScreen,
  establishRecvFile,
  establishSendFile,
  getRtpCapabilities,
  setFileConsumer,
  waitSetFileConsumer,
} from "./signaling";
import { loadDevice, setDataConsumer, setDataProducer } from "./mediasoup";
import { AuthInfo, FileInfo } from "./signaling/type";
import { ControlData } from "../../util/type";
import { updateFiles } from "./fileShare";
import { FileWatchList, FileWatchMsg } from "./fileShare/type";
import { timer } from "../../util";

export const listenAuth = (
  socket: Socket,
  desktopId: string,
  password: string,
) => {
  socket.on("reqRtpCap", (info: AuthInfo) => {
    if (desktopId === info.desktopId && password === info.password) {
      socket.emit("resRtpCap", { clientId: info.clientId, status: true });
    } else {
      socket.emit("resRtpCap", { clientId: info.clientId, status: false });
    }
  });
};

export const createDevice = async (
  socket: Socket,
  desktopId: string,
): Promise<mediasoupClient.types.Device> => {
  const forDevice = getRtpCapabilities(socket, desktopId);
  const device = await loadDevice(forDevice);
  return device;
};

// ----- Screen

export const setScreen = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  desktopId: string,
): Promise<mediasoupClient.types.DataProducer | undefined> => {
  const forTransport = createDesktopScreen(socket, desktopId);
  const forConnect = connectDesktopScreen(socket, desktopId);
  const forProducedata = establishDesktopScreen(socket, desktopId);
  const producer = await setDataProducer(
    device,
    forTransport,
    forConnect,
    forProducedata,
    { ordered: false, maxRetransmits: 0 },
  );
  return producer;
};

// ----- Control
export const setControl = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  desktopId: string,
  control: (data: ControlData) => Promise<void>,
): Promise<mediasoupClient.types.DataConsumer | undefined> => {
  const forTransport = createDesktopControl(socket, desktopId);
  const forConnect = connectDesktopControl(socket, desktopId);
  const forConsumeData = establishDesktopControl(socket, desktopId);
  const consumer = await setDataConsumer(
    device,
    forTransport,
    forConnect,
    forConsumeData,
  );

  if (consumer?.readyState === "open") {
    consumer.on("message", (msg) => {
      const buf = Buffer.from(msg as ArrayBuffer);
      const data: ControlData = JSON.parse(buf.toString());

      // window.desktop.control(displayName, data);
      control(data);
    });
  } else if (consumer) {
    consumer.on("open", () => {
      consumer.on("message", (msg) => {
        const buf = Buffer.from(msg as ArrayBuffer);
        const data: ControlData = JSON.parse(buf.toString());

        // window.desktop.control(displayName, data);
        control(data);
      });
    });
  }

  return consumer;
};

// ----- Audio
export const setAudio = async (
  socket: Socket,
  desktopId: string,
  pulseAudioDevice: number,
): Promise<number | undefined> => {
  const params = await establishDesktopAudio(socket, desktopId);

  // const buf = Buffer.from(data as ArrayBuffer);
  // const msg = JSON.parse(buf.toString());
  const msg = params;
  console.log(msg);

  const ffmpegPid = await window.desktop.getAudio(pulseAudioDevice, msg);
  return ffmpegPid;
};

// ----- FileWatch
export const setFileWatch = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  desktopId: string,
  dir: string,
  fileList: FileWatchList,
): Promise<mediasoupClient.types.DataProducer | undefined> => {
  const forTransport = createDesktopFileWatch(socket, desktopId);
  const forConnect = connectDesktopFileWatch(socket, desktopId);
  const forProducedata = establishDesktopFileWatch(socket, desktopId);
  const producer = await setDataProducer(
    device,
    forTransport,
    forConnect,
    forProducedata,
  );

  if (producer?.readyState === "open") {
    window.fileShare.streamFileWatchMsg((data: FileWatchMsg) => {
      producer.send(JSON.stringify(data));
      updateFiles(fileList, data);
    });
    await window.fileShare.sendFileWatch(dir);
  } else if (producer) {
    producer.on("open", async () => {
      window.fileShare.streamFileWatchMsg((data: FileWatchMsg) => {
        producer.send(JSON.stringify(data));
        updateFiles(fileList, data);
      });
      await window.fileShare.sendFileWatch(dir);
    });
  }

  socket.on("requestFileWatch", async () => {
    await window.fileShare.sendFileWatch(dir);
  });

  return producer;
};

// ----- SendFile
export const setSendFile = async (
  device: mediasoupClient.types.Device,
  socket: Socket,
  fileTransferId: string,
  fileName: string,
): Promise<mediasoupClient.types.DataProducer | undefined> => {
  const forTransport = createSendFile(socket, fileTransferId);
  const forConnect = connectSendFile(socket, fileTransferId);
  const forProducedata = establishSendFile(socket, fileTransferId);
  const producer = await setDataProducer(
    device,
    forTransport,
    forConnect,
    forProducedata,
  );

  const fileInfo = await window.fileShare.getFileInfo(fileName);
  if (fileInfo) {
    await WaitFileConsumer(
      socket,
      fileTransferId,
      fileInfo.fileName,
      fileInfo.fileSize,
    );

    if (producer?.readyState === "open") {
      const result = await window.fileShare.sendFileBuffer(
        fileInfo.fileName,
        fileTransferId,
      );
      if (!result) socket.emit("endTransferFile", fileTransferId);
    } else if (producer) {
      producer.on("open", async () => {
        const result = await window.fileShare.sendFileBuffer(
          fileInfo.fileName,
          fileTransferId,
        );
        if (!result) socket.emit("endTransferFile", fileTransferId);
      });
    }
  } else {
    socket.emit("endTransferFile", fileTransferId);
  }

  return producer;
  // producer.on("close", () => {
  //   transport.close();
  //   delete this.fileProducers[fileTransferId];
  // });
};

const WaitFileConsumer = async (
  socket: Socket,
  fileTransferId: string,
  fileName: string,
  fileSize: number,
): Promise<string> => {
  const fileInfo: FileInfo = {
    fileTransferId,
    fileName,
    fileSize,
  };
  const onReady = waitSetFileConsumer(socket, fileInfo);
  return await onReady();
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

  const isSet = await window.fileShare.setFileInfo(
    fileInfo.fileName,
    fileInfo.fileSize,
  );
  console.log(`isSet: ${isSet}`);
  if (!isSet) {
    socket.emit("endTransferFile", fileInfo.fileTransferId);
    return undefined;
  }

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
  let stamp = 0;
  let checkStamp = 0;
  let limit = 3;
  let isClosed = false;

  consumer.on("message", async (msg: ArrayBuffer) => {
    stamp++;
    const buf = new Uint8Array(msg);
    const receivedSize = await window.fileShare.recvFileBuffer(
      fileInfo.fileName,
      buf,
    );
    // console.log(`${fileInfo.fileName} stamp: ${stamp}`);
    if (receivedSize === fileInfo.fileSize) {
      isClosed = true;
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
        window.fileShare.destroyRecvFileBuffer(fileInfo.fileName);
        socket.emit("endTransferFile", fileInfo.fileTransferId);
        break;
      }
    } else {
      checkStamp = stamp;
    }
  }
};
