import { io } from "socket.io-client";
import { DesktopWebRTC } from "./desktop";

const interval = 100; //300;
// let displayNum = 1;

//process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const elementIdList = document.getElementById("desktopId");
const elementScreen = document.getElementById("screen");
const elementfileList = document.getElementById("fileList");
const runButton: HTMLButtonElement = <HTMLButtonElement>(
  document.getElementById("runButton")
);
runButton.onclick = () => start();

const start = async () => {
  const appPath = (<HTMLInputElement>document.getElementById("appPath")).value;

  if (appPath === "") {
    return;
  }

  for (let displayNum = 1; ; displayNum++) {
    const isStart = await window.desktop.startApp(displayNum, appPath);
    if (isStart) {
      runButton.disabled = true;

      const ip_addr = await window.util.getAddress();

      const socket = io(`https://${ip_addr}:3100`, {
        secure: true,
        rejectUnauthorized: false,
      });

      socket.on("desktopId", (msg) => {
        if (typeof msg === "string") {
          if (elementIdList) {
            elementIdList.textContent = `desktopID: ${msg}`;
          }

          const desktopWebRTC = new DesktopWebRTC(
            displayNum,
            msg,
            socket,
            interval,
            true,
            false,
            false,
          );

          if (elementScreen) {
            elementScreen.appendChild(desktopWebRTC.canvas);
          }

          socket.on("disconnect", () => {
            desktopWebRTC.deleteDesktop();
          });

          if (elementfileList) {
            const inputDirPath: HTMLInputElement =
              document.createElement("input");
            elementfileList.appendChild(inputDirPath);
            window.util.getBasePath().then((path) => {
              inputDirPath.value = `${path}/test`;
            });

            const fileButton: HTMLButtonElement =
              document.createElement("button");
            fileButton.textContent = "fileShare";
            elementfileList.appendChild(fileButton);
            fileButton.onclick = async () => {
              const dirPath = inputDirPath.value;
              if (dirPath === "") {
                return;
              }
              const elementfileShare = document.createElement("div");
              elementfileList.appendChild(elementfileShare);
              const result = await desktopWebRTC.startFileShare(
                dirPath,
                elementfileShare,
              );

              if (result) {
                fileButton.disabled = true;
                elementfileList.removeChild(inputDirPath);
                elementfileList.removeChild(fileButton);
              }
            };
          }
        }
      });

      break;
    }
  }
};
