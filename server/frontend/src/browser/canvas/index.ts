import * as mediasoupClient from "mediasoup-client";
import { ButtonJson, KeyJson, MotionJson, MousePos } from "./type";
import { KeySims } from "./keySim";

export const controlEventListener = (
  canvas: HTMLCanvasElement,
  producer: mediasoupClient.types.DataProducer,
): void => {
  canvas.addEventListener(
    "mousedown",
    () => {
      const button: ButtonJson = { button: { buttonMask: 0x1, down: true } };
      producer.send(JSON.stringify(button));
      //console.log("mousedown: " + JSON.stringify(event));
    },
    false,
  );
  canvas.addEventListener(
    "mouseup",
    () => {
      const button: ButtonJson = { button: { buttonMask: 0x1, down: false } };
      producer.send(JSON.stringify(button));
      //console.log("mouseup: " + JSON.stringify(event));
    },
    false,
  );
  canvas.addEventListener(
    "mousemove",
    (event) => {
      const pos = getPos(canvas, event);
      const motion: MotionJson = {
        move: { x: Math.round(pos.x), y: Math.round(pos.y) },
      };
      producer.send(JSON.stringify(motion));
      //console.log("mousemove : x=" + pos.x + ", y=" + pos.y);
    },
    false,
  );

  canvas.addEventListener(
    "contextmenu",
    (event) => {
      event.preventDefault();
      const buttonDown: ButtonJson = {
        button: { buttonMask: 0x4, down: true },
      };
      const buttonUp: ButtonJson = { button: { buttonMask: 0x4, down: false } };
      producer.send(JSON.stringify(buttonDown));
      producer.send(JSON.stringify(buttonUp));
      //console.log(JSON.stringify(event));
    },
    false,
  );

  canvas.addEventListener(
    "keydown",
    (event) => {
      event.preventDefault();
      const keySim = keyborad(event);
      if (keySim) {
        const key: KeyJson = { key: { keySim: keySim, down: true } };
        producer.send(JSON.stringify(key));
      }
      //console.log("keycode down: " + event.key + ' shift:' + event.shiftKey + ' ctrl:' + event.ctrlKey + ' ' + event.keyCode + ' ' + String.fromCharCode(event.keyCode));
    },
    false,
  );
  canvas.addEventListener(
    "keyup",
    (event) => {
      event.preventDefault();
      const keySim = keyborad(event);
      if (keySim) {
        const key: KeyJson = { key: { keySim: keySim, down: false } };
        producer.send(JSON.stringify(key));
      }
      //console.log("keycode up: " + event.key + ' shift:' + event.shiftKey + ' ctrl:' + event.ctrlKey + ' ' + event.keyCode + ' ' + String.fromCharCode(event.keyCode));
    },
    false,
  );

  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      if (event.deltaY / 100 > 0) {
        const button: ButtonJson = { button: { buttonMask: 0x10, down: true } };
        producer.send(JSON.stringify(button));
      } else {
        const button: ButtonJson = { button: { buttonMask: 0x8, down: true } };
        producer.send(JSON.stringify(button));
      }
      //console.log("scroll: "+JSON.stringify(data.wheel));
    },
    false,
  );
};

const getPos = (canvas: HTMLCanvasElement, event: MouseEvent): MousePos => {
  const mouseX = event.clientX - canvas.getBoundingClientRect().left;
  const mouseY = event.clientY - canvas.getBoundingClientRect().top;
  return { x: mouseX, y: mouseY };
};

const keyborad = (msg: KeyboardEvent): number | undefined => {
  if (msg.key.length == 1 && msg.key.match(/[a-z]/i)) {
    return msg.key.charCodeAt(0);
    //console.log("key: "+ msg.key.toUpperCase());
  } else if (msg.key.length == 1 && msg.key.match(/[0-9]/)) {
    //0~9
    const num = msg.key.match(/[0-9]/);
    const code = num ? (num[0] ? num[0].charCodeAt(0) : undefined) : undefined;
    return code;
    //console.log("Num: " + JSON.stringify(msg.key));
  } else if (msg.key.match(/^F[1-9]*/)) {
    //F1~9
    const keys = msg.key.match(/^F[1-9]*/);
    const keySim = keys ? KeySims[`${keys[0]}${keys[1]}`] : undefined;
    return keySim;
    //console.log("F: "+JSON.stringify(msg.key));
  } else if (msg.key == "Control") {
    return KeySims["Control_L"];
  } else if (msg.key == "Alt") {
    return KeySims["Alt_L"];
  } else if (msg.key == "Shift") {
    return KeySims["Shift_L"];
  } else if (msg.key == "Escape") {
    return KeySims["Escape"];
  } else if (msg.key == "Enter") {
    return KeySims["Return"];
  } else if (msg.key == "Backspace") {
    return KeySims["BackSpace"];
  } else if (msg.key == "Tab") {
    return KeySims["Tab"];
  } else if (msg.key == "Home") {
    return KeySims["Home"];
  } else if (msg.key == "End") {
    return KeySims["End"];
  } else if (msg.key == "PageUp") {
    return KeySims["Page_Up"];
  } else if (msg.key == "PageDown") {
    return KeySims["Page_Down"];
  } else if (msg.key == "ArrowRight") {
    return KeySims["Right"];
  } else if (msg.key == "ArrowLeft") {
    return KeySims["Left"];
  } else if (msg.key == "ArrowUp") {
    return KeySims["Up"];
  } else if (msg.key == "ArrowDown") {
    return KeySims["Down"];
  } else if (msg.key == "Insert") {
    return KeySims["Insert"];
  } else if (msg.key == "Delete") {
    return KeySims["Delete"];
  } else if (msg.key == " ") {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "Alphanumeric") {
    return KeySims["Caps_Lock"];
  } else if (msg.key == "[" || msg.keyCode == 219) {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "]" || msg.keyCode == 221) {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "-") {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "," || msg.keyCode == 188) {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "." || msg.keyCode == 190) {
    return msg.key.charCodeAt(0);
  }
  //
  else if (msg.key == "/" || msg.keyCode == 191) {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "\\" || msg.keyCode == 220) {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "+") {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "_") {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "=") {
    return msg.key.charCodeAt(0);
  } else if (msg.key == ":") {
    return msg.key.charCodeAt(0);
  } else if (msg.key == '"') {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "`") {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "~") {
    return msg.key.charCodeAt(0);
  }
  // --- Shift + 0~9
  else if (msg.key == "!") {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "@") {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "#") {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "$") {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "%") {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "^") {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "&") {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "*") {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "(") {
    return msg.key.charCodeAt(0);
  } else if (msg.key == ")") {
    return msg.key.charCodeAt(0);
  } else if (msg.key.length == 1) {
    const keySim = msg.key.charCodeAt(0);
    return !Number.isNaN(keySim) ? keySim : undefined;
  }

  //console.log(JSON.stringify(keydata));
  return undefined;
};
