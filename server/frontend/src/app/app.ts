import { io, Socket } from 'socket.io-client';
import { BrowserWebRTC } from '../browser';
let clientList: BrowserWebRTC[] = [];
let socket: Socket;

const sendButton: HTMLButtonElement = <HTMLButtonElement>document.getElementById("sendButton");
sendButton.onclick = () => start();

function start() {
    const elementInputMessage: HTMLInputElement = <HTMLInputElement>document.getElementById('inputText');

    let inputMessage = elementInputMessage.value;
    if (inputMessage === '') {
        return;
    }
    //document.getElementById('inputText').value = '';

    if (!socket) {
        socket = createWebSocket();
    }

    const client = new BrowserWebRTC(inputMessage, socket, true);

    const elementScreen = document.getElementById('screen');
    if (elementScreen) {
        elementScreen.appendChild(client.canvas);
        clientList.forEach((value, key) => {
            if (value.desktopId == client.desktopId) {
                elementScreen.removeChild(elementScreen.childNodes.item(key));
                //console.log("key: " + key + ", " + clientList[key].desktopAddress);
                //console.log(document.getElementById('screen').childNodes);
                delete clientList[key];
                clientList.splice(key, 1);
            }
        })
    }
    
    clientList.push(client);
}

const createWebSocket = (): Socket => {
    const sock = io('/');
    sock.on("end", () => {
        sock.close();
    })
    sock.on("disconnect", () => {
        console.log("socket closed");
        sock.close();
    })
    return sock;
}
