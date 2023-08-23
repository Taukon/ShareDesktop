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
  data: Uint8Array;
};

// appBuffer.byteLength <= max
export const parseAppProtocol = (appBuffer: Uint8Array): AppHeader => {
  const appHeader = new DataView(appBuffer.slice(0, 9).buffer);

  // id: 4B
  const id = appHeader.getUint32(0);

  // status: 1B
  const status = appHeader.getUint8(4);

  // offset: 4B
  const offset = appHeader.getUint32(5);

  const data = appBuffer.slice(9);

  return { id, status, offset, data };
};

export const createAppProtocol = (
  data: Uint8Array,
  send: (buffer: ArrayBuffer) => void,
) => {
  if (data.byteLength > appMax - appHeader) {
    let offset = 0;
    const dataLength = data.byteLength;
    const id = getRandomInt(appMaxId);

    while (offset < dataLength) {
      const sliceData = data.slice(offset, offset + appMax - appHeader);

      // header
      const header = new Uint8Array(appHeader);
      const dataHeader = new DataView(header.buffer);

      // id: 4B
      dataHeader.setUint32(0, id, false);

      // status: 1B
      if (offset === 0) {
        dataHeader.setUint8(4, appStatus.start);
      } else if (offset + sliceData.byteLength < dataLength) {
        dataHeader.setUint8(4, appStatus.middle);
      } else {
        dataHeader.setUint8(4, appStatus.end);
      }

      // offset: 4B
      dataHeader.setUint32(5, offset, false);

      offset += sliceData.byteLength;

      const appBuffer = appendBuffer(header, data);
      send(appBuffer);
    }
  } else {
    //
    const id = getRandomInt(appMaxId);

    // header
    const header = new Uint8Array(appHeader);
    const dataHeader = new DataView(header.buffer);

    // id: 4B
    dataHeader.setUint32(0, id, false);

    // status: 1B
    dataHeader.setUint8(4, appStatus.once);

    // offset: 4B
    dataHeader.setUint32(5, 0x0, false);

    const appBuffer = appendBuffer(header, data);
    send(appBuffer);
  }
};

const appendBuffer = (buffer1: Uint8Array, buffer2: Uint8Array) => {
  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp;
};

const getRandomInt = (max: number) => {
  return Math.floor(Math.random() * max);
};
