import { io } from 'socket.io-client';
import { DesktopRtc } from './desktopRtc';

const interval = 100;//300;
const displayNum = 1;

//process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const start = async () => {
  const ip_addr = await window.api.getAddress();

  const socket = io(`https://${ip_addr}:3100`, { secure: true, rejectUnauthorized: false});
  //const socket = io(`https://${ip_addr}:3100`);

  const isStart = await window.api.startApp(displayNum);
  if(isStart){
    socket.on('desktopId', msg => {
      if(typeof msg === 'string'){
          console.log(`desktopId: ${msg}`);
          
          const desktopRtc = new DesktopRtc(displayNum, msg, socket, interval);
          desktopRtc.initDesktopNoAudio();
          //desktopRtc.initDesktop();
  
          socket.on('disconnect', () => {
              desktopRtc.deleteDesktop();
          });
      }
    });
  }

};

start();


