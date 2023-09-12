import { io, Socket } from "socket.io-client";
import { RtpCapabilities } from "mediasoup-client/lib/types";
import { BrowserWebRTC, reqAccess } from "../browser";
import { Access } from "../browser/signaling/type";

const createWebSocket = (): Socket => {
  const sock = io("/");
  sock.on("end", () => {
    sock.close();
  });
  sock.on("disconnect", () => {
    console.log("socket closed");
    sock.close();
  });
  return sock;
};

const clientList: BrowserWebRTC[] = [];
const socket = createWebSocket();

const setOption: HTMLDivElement = <HTMLDivElement>(
  document.getElementById("setOption")
);

const setOptionForm = (socket: Socket) => {
  const optionForm = document.createElement("p");
  setOption.appendChild(optionForm);

  optionForm.appendChild(document.createTextNode(" desktopID: "));
  const inputDesktopId = document.createElement("input");
  optionForm.appendChild(inputDesktopId);

  optionForm.appendChild(document.createTextNode(" password: "));
  const inputPwd = document.createElement("input");
  inputPwd.value = "shareDesktop";
  optionForm.appendChild(inputPwd);

  const sendButton = document.createElement("button");
  sendButton.textContent = "開始";
  optionForm.appendChild(sendButton);
  sendButton.onclick = () =>
    reqAccess(socket, inputDesktopId.value, inputPwd.value, start);
};

const start = (
  socket: Socket,
  access: Access,
  rtpCap: RtpCapabilities,
): void => {
  const client = new BrowserWebRTC(socket, access, rtpCap, false);

  const elementScreen = document.getElementById("screen");
  if (elementScreen) {
    const desktopDiv = document.createElement("div");
    desktopDiv.id = client.desktopId;
    elementScreen.appendChild(desktopDiv);
    desktopDiv.appendChild(client.canvas);

    const fileShareButton = document.createElement("button");
    fileShareButton.textContent = "fileShare";
    desktopDiv.appendChild(fileShareButton);
    const onClick = async () => {
      const result = await client.startFileShare();
      if (result && client.fileDownload && client.fileUpload) {
        desktopDiv.appendChild(client.fileDownload);
        desktopDiv.appendChild(client.fileUpload.input);
        desktopDiv.appendChild(client.fileUpload.button);

        desktopDiv.removeChild(fileShareButton);
        fileShareButton.disabled = true;
        fileShareButton.removeEventListener("click", onClick);
      }
    };
    fileShareButton.addEventListener("click", onClick);

    clientList.forEach((value, key) => {
      if (value.desktopId == client.desktopId) {
        elementScreen.removeChild(elementScreen.childNodes.item(key));
        //console.log("key: " + key + ", " + clientList[key].desktopAddress);
        //console.log(document.getElementById('screen').childNodes);
        delete clientList[key];
        clientList.splice(key, 1);
      }
    });
  }

  clientList.push(client);
};

setOptionForm(socket);
