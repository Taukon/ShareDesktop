export const timer = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });

// App Protocol
//   header: 9B
// ---------------
// | 4B: id
// ---------------
// | 1B: status
// ---------------
// | 4B: offset
// ---------------

export const appMax = 65536;
export const appHeader = 9;
export const appMaxId = 4294967295;
export const appStatus = {
  start: 0x0,
  middle: 0x1,
  end: 0x2,
  once: 0x3,
};

type AppHeader = {
  id: number;
  status: number;
  offset: number;
  data: Buffer;
};

// appBuffer.byteLength <= max
export const parseAppProtocol = (appBuffer: Buffer): AppHeader => {
  // id: 4B
  const id = appBuffer.readUintBE(0, 4);

  // status: 1B
  const status = appBuffer.readUintBE(4, 1);

  // offset: 4B
  const offset = appBuffer.readUintBE(5, 4);

  const data = appBuffer.subarray(9);

  return { id, status, offset, data };
};

export const createAppProtocol = (
  data: Buffer,
  send: (buffer: ArrayBuffer) => void,
) => {
  if (data.byteLength > appMax - appHeader) {
    let offset = 0;
    const dataLength = data.byteLength;
    const id = getRandomInt(appMaxId);

    while (offset < dataLength) {
      const sliceData = data.slice(offset, offset + appMax - appHeader);

      // header
      const dataHeader = Buffer.alloc(appHeader);

      // id: 4B
      dataHeader.writeUIntBE(id, 0, 4);

      // status: 1B
      if (offset === 0) {
        dataHeader.writeUIntBE(appStatus.start, 4, 1);
      } else if (offset + sliceData.byteLength < dataLength) {
        dataHeader.writeUIntBE(appStatus.middle, 4, 1);
      } else {
        dataHeader.writeUIntBE(appStatus.end, 4, 1);
      }

      // offset: 4B
      dataHeader.writeUIntBE(offset, 5, 4);

      offset += sliceData.byteLength;

      const appBuffer = appendBuffer(dataHeader, data);
      send(appBuffer);
    }
  } else {
    const id = getRandomInt(appMaxId);

    // header
    const dataHeader = Buffer.alloc(appHeader);

    // id: 4B
    dataHeader.writeUIntBE(id, 0, 4);

    // status: 1B
    dataHeader.writeUIntBE(appStatus.once, 4, 1);

    // offset: 4B
    dataHeader.writeUIntBE(0, 5, 4);

    const appBuffer = appendBuffer(dataHeader, data);
    send(appBuffer);
  }
};

const appendBuffer = (buffer1: Buffer, buffer2: Buffer) => {
  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp;
};

const getRandomInt = (max: number) => {
  return Math.floor(Math.random() * max);
};
