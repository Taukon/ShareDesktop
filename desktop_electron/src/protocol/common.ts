// App Protocol
//   header: 9B
// ---------------
// | 4B: id
// ---------------
// | 1B: status
// ---------------
// | 4B: order
// ---------------

export const appMax = 65536;
export const appHeader = 9;
export const appMaxId = 4294967295;
export const appStatus = {
  start: 0x0,
  middle: 0x1,
  end: 0x2,
  once: 0x3,
  control: 0x4,
  fileWatch: 0x5,
  fileRequestWrite: 0x6,
  fileRequestRead: 0x7,
  fileAccept: 0x8,
  fileError: 0x9,
};

export const getRandomInt = (max: number) => {
  return Math.floor(Math.random() * max);
};
