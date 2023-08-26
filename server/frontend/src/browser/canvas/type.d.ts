export type KeyJson = { key: { keySim: number; down: boolean } };
export type ButtonJson = { button: { buttonMask: number; down: boolean } };
export type MotionJson = { move: { x: number; y: number } };

export type MousePos = { x: number; y: number };

export type KeySymObject = {
  [prop: string]: number;
};
