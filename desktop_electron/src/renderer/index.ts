import { io } from "socket.io-client";
import { DesktopWebRTCXvfb } from "./desktop/xvfb";
import { DesktopWebRTCUserMedia } from "./desktop/userMedia";

const interval = 100; //300;
const onDisplayScreen = true;
const onAudio = false;
let mode = true;

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
    if (display) window.desktop.setXkbLayout(display, xkbLayout.value);
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
      await window.desktop.startX11App(display, inputAppPath.value);
    }
  };
  appForm.appendChild(appButton);
};

const startXvfb = async (
  displayNum: number,
  xkbLayout: string,
  im: boolean,
  fullScreen: boolean,
  runButton: HTMLButtonElement,
  width: number,
  height: number,
): Promise<boolean> => {
  const isStart = await window.desktop.startXvfb(displayNum, width, height);
  if (isStart) {
    runButton.disabled = true;

    await window.desktop.setXkbLayout(displayNum, xkbLayout);
    if (im) {
      await window.desktop.setInputMethod(displayNum);
    }

    const ip_addr = await window.util.getAddress();

    const socket = io(`https://${ip_addr}:3100`, {
      secure: true,
      rejectUnauthorized: false,
    });

    socket.on("desktopId", (msg) => {
      if (typeof msg === "string") {
        if (desktopIdList) {
          desktopIdList.textContent = `desktopID: ${msg}`;
        }

        const desktopWebRTC = new DesktopWebRTCXvfb(
          displayNum,
          msg,
          socket,
          interval,
          onDisplayScreen,
          fullScreen,
          onAudio,
        );

        screen?.appendChild(desktopWebRTC.canvas);

        socket.on("disconnect", () => {
          desktopWebRTC.deleteDesktop();
        });

        setFileShare(desktopWebRTC);
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

  const audioForm = document.createElement("p");
  audioForm.textContent = "audio enable: ";
  userMediaOption.appendChild(audioForm);
  const audio = document.createElement("input");
  audio.setAttribute("type", "radio");
  audioForm.appendChild(audio);

  const screenForm = document.createElement("p");
  const info = await window.desktop.getDisplayInfo();
  for (const item of info) {
    const button = document.createElement("button");
    button.textContent = `${item.name} | ${item.id}`;
    button.addEventListener("click", async () => {
      desktopMode.disabled = true;
      startUserMedia(item.id, audio.checked);
      userMediaOption.remove();
    });
    screenForm.appendChild(button);
    screenForm.appendChild(document.createElement("br"));
  }
  userMediaOption.appendChild(screenForm);
};

const startUserMedia = async (sourceId: string, audio: boolean) => {
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

    socket.on("desktopId", (msg) => {
      if (typeof msg === "string") {
        if (desktopIdList) {
          desktopIdList.textContent = `desktopID: ${msg}`;
        }
        //
        const regex = /:(\d+):/; // 正規表現パターンを定義
        const match = sourceId.match(regex); // 正規表現にマッチする部分を抽出
        if (match && match[1]) {
          const extractedNumber = parseInt(match[1], 10); // マッチした部分をnumber型に変換
          const desktopWebRTC = new DesktopWebRTCUserMedia(
            extractedNumber, //sourceId
            msg,
            socket,
            interval,
            onDisplayScreen,
            stream,
            onAudio,
          );

          if (onDisplayScreen) {
            screen?.appendChild(desktopWebRTC.canvas);
          }

          socket.on("disconnect", () => {
            desktopWebRTC.deleteDesktop();
          });

          setFileShare(desktopWebRTC);
        }
        //
      }
    });
  } catch (e) {
    console.log("error. orz");
    console.log(e);
  }
};

const setFileShare = (
  desktopWebRTC: DesktopWebRTCXvfb | DesktopWebRTCUserMedia,
) => {
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
      const dirPath = inputDirPath.value;
      if (dirPath === "") {
        return;
      }
      const fileShare = document.createElement("div");
      fileList.appendChild(fileShare);
      const result = await desktopWebRTC.startFileShare(dirPath, fileShare);

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
