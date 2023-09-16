import { io, Socket } from "socket.io-client";
import {
  BrowserWebRTC,
  initShareApp,
  initShareFile,
  reqAccess,
} from "../browser";
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

const start = async (socket: Socket, access: Access): Promise<void> => {
  const client: BrowserWebRTC = {
    access: access,
    shareApp: initShareApp(access.desktopId, true),
    shareFile: initShareFile(access.desktopId),
  };

  client.device = await client.shareApp.startShareApp(socket, access);

  const elementScreen = document.getElementById("screen");
  if (elementScreen) {
    const desktopDiv = document.createElement("div");
    desktopDiv.id = client.access.desktopId;
    elementScreen.appendChild(desktopDiv);
    desktopDiv.appendChild(client.shareApp.canvas);

    const fileShareButton = document.createElement("button");
    fileShareButton.textContent = "fileShare";
    desktopDiv.appendChild(fileShareButton);
    const onClick = async () => {
      client.device = await client.shareFile.startShareFile(
        socket,
        access,
        client.device,
      );
      if (
        client.device &&
        client.shareFile.fileDownload &&
        client.shareFile.fileUpload
      ) {
        desktopDiv.appendChild(client.shareFile.fileDownload);
        desktopDiv.appendChild(client.shareFile.fileUpload.input);
        desktopDiv.appendChild(client.shareFile.fileUpload.button);

        desktopDiv.removeChild(fileShareButton);
        fileShareButton.disabled = true;
        fileShareButton.removeEventListener("click", onClick);
      }
    };
    fileShareButton.addEventListener("click", onClick);

    // elementScreen.appendChild(client.canvas);
    clientList.forEach((value, key) => {
      if (value.access.desktopId == client.access.desktopId) {
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
