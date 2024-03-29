import { Socket, io } from "socket.io-client";
import {
  initShareFile,
  initShareHostApp,
  initShareVirtualApp,
  setAuth,
} from "./desktop";
import { Device } from "mediasoup-client";

const interval = 100; //300;
const onDisplayScreen = true;
const onAudio = false;
let mode = true;
let device: Device | undefined;

//process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const desktopIdList = document.getElementById("desktopId");
const screen = document.getElementById("screen");
const fileList = document.getElementById("fileList");

const desktopMode: HTMLButtonElement = <HTMLButtonElement>(
  document.getElementById("desktopMode")
);
const desktopOption: HTMLDivElement = <HTMLDivElement>(
  document.getElementById("desktopOption")
);

desktopMode.onclick = async () => {
  mode = !mode;
  if (mode) {
    desktopMode.disabled = true;
    xvfbMode();
    desktopMode.disabled = false;
  } else {
    desktopMode.disabled = true;
    await userMediaMode();
    desktopMode.disabled = false;
  }
};

const xvfbMode = () => {
  (<HTMLDivElement>document.getElementById("userMediaOption"))?.remove();
  (<HTMLDivElement>document.getElementById("xvfbOption"))?.remove();
  const xvfbOption = document.createElement("div");
  xvfbOption.id = "xvfbOption";
  desktopOption.append(xvfbOption);

  // password
  const pwdForm = document.createElement("p");
  xvfbOption.appendChild(pwdForm);
  pwdForm.appendChild(document.createTextNode(" password: "));
  const inputPwd = document.createElement("input");
  inputPwd.value = "shareDesktop";
  pwdForm.appendChild(inputPwd);

  // Xvfb Size
  const xvfbSizeForm = document.createElement("p");
  xvfbOption.appendChild(xvfbSizeForm);
  xvfbSizeForm.appendChild(document.createTextNode(" width: "));
  const inputWidth = document.createElement("input");
  inputWidth.setAttribute("type", "number");
  inputWidth.setAttribute("min", "1");
  inputWidth.value = "1200";
  xvfbSizeForm.appendChild(inputWidth);
  xvfbSizeForm.appendChild(document.createTextNode(" height: "));
  const inputHeight = document.createElement("input");
  inputHeight.setAttribute("type", "number");
  inputHeight.setAttribute("min", "1");
  inputHeight.value = "720";
  xvfbSizeForm.appendChild(inputHeight);

  // xkbmap layout
  let display = 0;
  const xkbForm = document.createElement("p");
  xvfbOption.appendChild(xkbForm);
  xkbForm.appendChild(document.createTextNode(" keyboard layout: "));
  const xkbLayout = document.createElement("input");
  xkbLayout.value = "jp";
  xkbForm.appendChild(xkbLayout);
  const xkbButton = document.createElement("button");
  xkbButton.textContent = "run";
  xkbButton.disabled = true;
  xkbButton.onclick = () => {
    if (display) window.shareApp.setXkbLayout(display, xkbLayout.value);
  };
  xkbForm.appendChild(xkbButton);

  const imForm = document.createElement("p");
  imForm.textContent = "Input Method enable: ";
  xvfbOption.appendChild(imForm);
  const im = document.createElement("input");
  im.setAttribute("type", "radio");
  imForm.appendChild(im);

  const screenForm = document.createElement("p");
  screenForm.textContent = "Full Screen enable: ";
  xvfbOption.appendChild(screenForm);
  const screen = document.createElement("input");
  screen.setAttribute("type", "radio");
  screenForm.appendChild(screen);

  const runButton = document.createElement("button");
  runButton.textContent = "Xvfb run";
  runButton.onclick = async () => {
    desktopMode.disabled = true;
    for (let displayNum = 1; ; displayNum++) {
      if (
        await startXvfb(
          inputPwd.value,
          displayNum,
          xkbLayout.value,
          im.checked,
          screen.checked,
          runButton,
          parseInt(inputWidth.value),
          parseInt(inputHeight.value),
        )
      ) {
        display = displayNum;
        xkbButton.disabled = false;
        appButton.disabled = false;
        break;
      }
    }
  };
  xvfbOption.appendChild(runButton);

  // app process
  const appForm = document.createElement("p");
  xvfbOption.appendChild(appForm);
  const inputAppPath = document.createElement("input");
  inputAppPath.value = "xterm";
  appForm.appendChild(inputAppPath);
  const appButton = document.createElement("button");
  appButton.textContent = "app run";
  appButton.disabled = true;
  appButton.onclick = async () => {
    if (inputAppPath.value === "") {
      return;
    }
    if (display) {
      await window.shareApp.startX11App(display, inputAppPath.value);
    }
  };
  appForm.appendChild(appButton);
};

const startXvfb = async (
  password: string,
  displayNum: number,
  xkbLayout: string,
  im: boolean,
  fullScreen: boolean,
  runButton: HTMLButtonElement,
  width: number,
  height: number,
): Promise<boolean> => {
  const isStart = await window.shareApp.startXvfb(displayNum, width, height);
  if (isStart) {
    runButton.disabled = true;

    await window.shareApp.setXkbLayout(displayNum, xkbLayout);
    if (im) {
      await window.shareApp.setInputMethod(displayNum);
    }

    const ip_addr = await window.util.getAddress();

    const socket = io(`https://${ip_addr}:3100`, {
      secure: true,
      rejectUnauthorized: false,
    });

    socket.on("desktopId", async (msg) => {
      if (typeof msg === "string") {
        if (desktopIdList) {
          desktopIdList.textContent = `desktopID: ${msg}`;
        }

        setAuth(msg, socket, password);
        const shareVirtualApp = initShareVirtualApp(
          displayNum,
          msg,
          socket,
          interval,
          onDisplayScreen,
          fullScreen,
          onAudio,
        );

        device = await shareVirtualApp.startShareApp(device);

        screen?.appendChild(shareVirtualApp.canvas);

        socket.on("disconnect", () => {
          shareVirtualApp.deleteDesktop();
        });

        setFileShare(msg, socket);
      }
    });
    return true;
  }
  return false;
};

const userMediaMode = async () => {
  (<HTMLDivElement>document.getElementById("userMediaOption"))?.remove();
  (<HTMLDivElement>document.getElementById("xvfbOption"))?.remove();
  const userMediaOption = document.createElement("div");
  userMediaOption.id = "xvfbOption";
  desktopOption.append(userMediaOption);

  // password
  const pwdForm = document.createElement("p");
  userMediaOption.appendChild(pwdForm);
  pwdForm.appendChild(document.createTextNode(" password: "));
  const inputPwd = document.createElement("input");
  inputPwd.value = "shareDesktop";
  pwdForm.appendChild(inputPwd);

  // audio
  const audioForm = document.createElement("p");
  audioForm.textContent = "audio enable: ";
  userMediaOption.appendChild(audioForm);
  const audio = document.createElement("input");
  audio.setAttribute("type", "radio");
  audioForm.appendChild(audio);

  // screen
  const screenForm = document.createElement("p");
  const info = await window.shareApp.getDisplayInfo();
  for (const item of info) {
    const button = document.createElement("button");
    button.textContent = `${item.name} | ${item.id}`;
    button.addEventListener("click", async () => {
      desktopMode.disabled = true;
      startUserMedia(inputPwd.value, item.id, audio.checked);
      userMediaOption.remove();
    });
    screenForm.appendChild(button);
    screenForm.appendChild(document.createElement("br"));
  }
  userMediaOption.appendChild(screenForm);
};

const startUserMedia = async (
  password: string,
  sourceId: string,
  audio: boolean,
) => {
  try {
    const stream: MediaStream =
      await // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator.mediaDevices as any).getUserMedia({
        audio: audio
          ? {
              mandatory: {
                chromeMediaSource: "desktop",
              },
            }
          : false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: sourceId,
          },
        },
      });

    //
    const ip_addr = await window.util.getAddress();

    const socket = io(`https://${ip_addr}:3100`, {
      secure: true,
      rejectUnauthorized: false,
    });

    socket.on("desktopId", async (msg) => {
      if (typeof msg === "string") {
        if (desktopIdList) {
          desktopIdList.textContent = `desktopID: ${msg}`;
        }
        //
        const regex = /:(\d+):/; // 正規表現パターンを定義
        const match = sourceId.match(regex); // 正規表現にマッチする部分を抽出
        if (match && match[1]) {
          const extractedNumber = parseInt(match[1], 10); // マッチした部分をnumber型に変換

          setAuth(msg, socket, password);

          const shareHostApp = initShareHostApp(
            extractedNumber, //sourceId
            msg,
            socket,
            interval,
            onDisplayScreen,
            stream,
            onAudio,
          );

          device = await shareHostApp.startShareApp(device);

          if (onDisplayScreen) {
            screen?.appendChild(shareHostApp.canvas);
          }

          socket.on("disconnect", () => {
            shareHostApp.deleteDesktop();
          });

          setFileShare(msg, socket);
        }
        //
      }
    });
  } catch (e) {
    console.log("error. orz");
    console.log(e);
  }
};

const setFileShare = (desktopId: string, socket: Socket) => {
  if (fileList) {
    const inputDirPath: HTMLInputElement = document.createElement("input");
    fileList.appendChild(inputDirPath);
    window.util.getBasePath().then((path) => {
      inputDirPath.value = `${path}/test`;
    });

    const fileButton: HTMLButtonElement = document.createElement("button");
    fileButton.textContent = "fileShare";
    fileList.appendChild(fileButton);
    fileButton.onclick = async () => {
      const shareFile = initShareFile(desktopId, socket);
      const dirPath = inputDirPath.value;
      if (dirPath === "") {
        return;
      }
      const fileShare = document.createElement("div");
      fileList.appendChild(fileShare);
      const result = await shareFile.startShareFile(dirPath, fileShare, device);

      if (result) {
        fileButton.disabled = true;
        fileList.removeChild(inputDirPath);
        fileList.removeChild(fileButton);
      }
    };
  }
};

if (mode) {
  desktopMode.disabled = true;
  xvfbMode();
  desktopMode.disabled = false;
} else {
  desktopMode.disabled = true;
  userMediaMode().then(() => {
    desktopMode.disabled = false;
  });
}
