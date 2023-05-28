// sudo apt install libx11-dev libjpeg-dev libxtst-dev

import { loadWrtc } from './wrtc.js';

loadWrtc();

// Polyfills

// import fetch from "node-fetch";

// // @ts-ignore
// import wrtc from "wrtc";
// declare global {
//   interface Window {
//     RTCPeerConnectionStatic: typeof wrtc.RTCPeerConnection;
//     RTCSessionDescription: typeof wrtc.RTCSessionDescription;
//     fetch: typeof fetch;
//   }
// }

import { io } from 'socket.io-client';

import { networkInterfaces } from "os";
import { DesktopRtc } from './desktopRtc.js';
const getIpAddress = (): string | undefined => {
  const nets = networkInterfaces();
  const net = nets["eth0"]?.find((v) => v.family == "IPv4");
  return net ? net.address : undefined;
}

const ip_addr = getIpAddress()?? "127.0.0.1"; // --- IP Address

const interval = 100;//300;

const socket = io(`https://${ip_addr}:3100`, { secure: true, rejectUnauthorized: false});

socket.on('desktopId', msg => {
    if(typeof msg === 'string'){
        console.log(`desktopId: ${msg}`);
        const desktopRtc = new DesktopRtc(msg, socket, interval);
        //desktopRtc.initDesktopNoAudio();
        desktopRtc.initDesktop();

        socket.on('disconnect', () => {
            desktopRtc.deleteDesktop();
        });
    }
});