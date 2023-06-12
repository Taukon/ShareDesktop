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
import { Xvfb } from './xvfb.js';
import { AppProcess } from './appProcess.js';

const getIpAddress = (): string | undefined => {
  const nets = networkInterfaces();
  const net = nets["eth0"]?.find((v) => v.family == "IPv4");
  return net ? net.address : undefined;
}

const ip_addr = getIpAddress()?? "127.0.0.1"; // --- IP Address

const interval = 100;//300;
const displayNum = 1;

const startDesktop = () => {
    const socket = io(`https://${ip_addr}:3100`, { secure: true, rejectUnauthorized: false});

    const xvfb = new Xvfb(displayNum, 
        {
            width: 1200,
            height: 720,
            depth: 24
        });

    if(xvfb.start()){
        const appProcess = new AppProcess(
            displayNum, 
            process.argv[2] ?? `xterm`, 
            [],
            () => xvfb.stop()
        );

        socket.on('desktopId', msg => {
            if(typeof msg === 'string'){
                console.log(`desktopId: ${msg}`);
                
                const desktopRtc = new DesktopRtc(displayNum, msg, socket, interval);
                //desktopRtc.initDesktopNoAudio();
                desktopRtc.initDesktop();

                process.on('exit', (e) => {
                    console.log(`exit: ${e}`);
                    appProcess.stop();
                    xvfb.stop();
                });

                process.on('SIGINT', (e) => {
                    console.log(`SIGINT: ${e}`);
                    // appProcess.stop();
                    // xvfb.stop();
                    process.exit(0);
                });
                process.on('uncaughtException', (e) => {
                    console.log(`uncaughtException: ${e}`);
                    appProcess.stop();
                    xvfb.stop();
                });
    
                socket.on('disconnect', () => {
                    desktopRtc.deleteDesktop();
                });
            }
        });
    }
};

startDesktop();