import * as mediasoupClient from "mediasoup-client";
import { ButtonJson, KeyJson, MotionJson, MousePos } from "./type";
import { KeySyms } from "./x11keySym";
import { appStatus, createAppProtocolFromJson } from "../util";

export const controlEventListener = (
  canvas: HTMLCanvasElement,
  producer: mediasoupClient.types.DataProducer,
): void => {
  canvas.addEventListener(
    "mousedown",
    () => {
      const button: ButtonJson = { button: { buttonMask: 0x1, down: true } };
      producer.send(
        createAppProtocolFromJson(JSON.stringify(button), appStatus.control),
      );
      //console.log("mousedown: " + JSON.stringify(event));
    },
    false,
  );
  canvas.addEventListener(
    "mouseup",
    () => {
      const button: ButtonJson = { button: { buttonMask: 0x1, down: false } };
      producer.send(
        createAppProtocolFromJson(JSON.stringify(button), appStatus.control),
      );
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
      producer.send(
        createAppProtocolFromJson(JSON.stringify(motion), appStatus.control),
      );
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
      producer.send(
        createAppProtocolFromJson(
          JSON.stringify(buttonDown),
          appStatus.control,
        ),
      );
      producer.send(
        createAppProtocolFromJson(JSON.stringify(buttonUp), appStatus.control),
      );
      //console.log(JSON.stringify(event));
    },
    false,
  );

  canvas.addEventListener(
    "keydown",
    (event) => {
      event.preventDefault();
      const keySym = keyborad(event);
      if (keySym) {
        const key: KeyJson = { key: { keySym: keySym, down: true } };
        producer.send(
          createAppProtocolFromJson(JSON.stringify(key), appStatus.control),
        );
        if (keySym === 0xff2a || keySym === 0xff28 || keySym === 0xff29) {
          producer.send(
            createAppProtocolFromJson(
              JSON.stringify({ key: { keySym: keySym, down: false } }),
              appStatus.control,
            ),
          );
        }
      }
      //console.log("keycode down: " + event.key + ' shift:' + event.shiftKey + ' ctrl:' + event.ctrlKey + ' ' + event.keyCode + ' ' + String.fromCharCode(event.keyCode));
    },
    false,
  );
  canvas.addEventListener(
    "keyup",
    (event) => {
      event.preventDefault();
      const keySym = keyborad(event);
      if (keySym) {
        const key: KeyJson = { key: { keySym: keySym, down: false } };
        producer.send(
          createAppProtocolFromJson(JSON.stringify(key), appStatus.control),
        );
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
        producer.send(
          createAppProtocolFromJson(JSON.stringify(button), appStatus.control),
        );
      } else {
        const button: ButtonJson = { button: { buttonMask: 0x8, down: true } };
        producer.send(
          createAppProtocolFromJson(JSON.stringify(button), appStatus.control),
        );
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
    const keySym = keys ? KeySyms[`${keys[0]}${keys[1]}`] : undefined;
    return keySym;
    //console.log("F: "+JSON.stringify(msg.key));
  } else if (msg.key == "Control") {
    return KeySyms["Control_L"];
  } else if (msg.key == "Alt") {
    return KeySyms["Alt_L"];
  } else if (msg.key == "Shift") {
    return KeySyms["Shift_L"];
  } else if (msg.key == "Escape") {
    return KeySyms["Escape"];
  } else if (msg.key == "Enter") {
    return KeySyms["Return"];
  } else if (msg.key == "Backspace") {
    return KeySyms["BackSpace"];
  } else if (msg.key == "Tab") {
    return KeySyms["Tab"];
  } else if (msg.key == "Home") {
    return KeySyms["Home"];
  } else if (msg.key == "End") {
    return KeySyms["End"];
  } else if (msg.key == "PageUp") {
    return KeySyms["Page_Up"];
  } else if (msg.key == "PageDown") {
    return KeySyms["Page_Down"];
  } else if (msg.key == "ArrowRight") {
    return KeySyms["Right"];
  } else if (msg.key == "ArrowLeft") {
    return KeySyms["Left"];
  } else if (msg.key == "ArrowUp") {
    return KeySyms["Up"];
  } else if (msg.key == "ArrowDown") {
    return KeySyms["Down"];
  } else if (msg.key == "Insert") {
    return KeySyms["Insert"];
  } else if (msg.key == "Delete") {
    return KeySyms["Delete"];
  } else if (msg.key == " ") {
    return msg.key.charCodeAt(0);
  } else if (msg.key == "Alphanumeric") {
    return KeySyms["Caps_Lock"];
  } else if (msg.key == "Hankaku") {
    return KeySyms["Hankaku"];
  } else if (msg.key == "Zenkaku") {
    return KeySyms["Zenkaku"];
  } else if (msg.key == "NonConvert") {
    return KeySyms["Muhenkan"];
  } else if (msg.key == "Convert") {
    return KeySyms["Henkan"];
  } else if (msg.key == "Hiragana") {
    return KeySyms["Hiragana_Katakana"];
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
    const keySym = msg.key.charCodeAt(0);
    return !Number.isNaN(keySym) ? keySym : undefined;
  }

  //console.log(JSON.stringify(keydata));
  return undefined;
};
