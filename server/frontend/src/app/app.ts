import { io, Socket } from "socket.io-client";
import { BrowserWebRTC } from "../browser";
const clientList: BrowserWebRTC[] = [];
let socket: Socket;

const sendButton: HTMLButtonElement = <HTMLButtonElement>(
  document.getElementById("sendButton")
);
sendButton.onclick = () => start();

function start() {
  const elementInputMessage: HTMLInputElement = <HTMLInputElement>(
    document.getElementById("inputText")
  );

  const inputMessage = elementInputMessage.value;
  if (inputMessage === "") {
    return;
  }
  //document.getElementById('inputText').value = '';

  if (!socket) {
    socket = createWebSocket();
  }

  const client = new BrowserWebRTC(inputMessage, socket, true);

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

    // elementScreen.appendChild(client.canvas);
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
}

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
