import { io } from "socket.io-client";
import { DesktopWebRTC } from "./desktop";

const interval = 100; //300;
const displayNum = 1;

//process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const sendButton: HTMLButtonElement = <HTMLButtonElement>(
  document.getElementById("sendButton")
);
const elementInputMessage: HTMLInputElement = <HTMLInputElement>(
  document.getElementById("inputText")
);
window.util.getBasePath().then((path) => {
  elementInputMessage.value = `${path}/test`;
});

const start = async () => {
  const ip_addr = await window.util.getAddress();

  const socket = io(`https://${ip_addr}:3100`, {
    secure: true,
    rejectUnauthorized: false,
  });
  //const socket = io(`https://${ip_addr}:3100`);

  const elementScreen = document.getElementById("screen");

  const isStart = await window.desktop.startApp(displayNum);
  if (isStart) {
    socket.on("desktopId", (msg) => {
      if (typeof msg === "string") {
        console.log(`desktopId: ${msg}`);

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

        sendButton.onclick = () => fileShare(desktopWebRTC, sendButton);
      }
    });
  }
};

start();

const fileShare = async (
  desktopWebRTC: DesktopWebRTC,
  button: HTMLButtonElement,
) => {
  const inputMessage = elementInputMessage.value;
  if (inputMessage === "") {
    return;
  }
  const elementfileShare = document.getElementById("fileList");
  if (elementfileShare) {
    const result = await desktopWebRTC.startFileShare(
      inputMessage,
      elementfileShare,
    );
    if (result) button.disabled = true;
    console.log(`fileShare: ${result}`);
  }
};
