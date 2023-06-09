import path from 'path';
import { networkInterfaces } from "os";
import { exec } from "child_process";
import { app, BrowserWindow, ipcMain } from "electron";
import {screenshot, converter, xtest} from "./x11lib";
import { Xvfb } from './xvfb';
import { AppProcess } from './appProcess';
import { AudioData, ControlData } from './util/type';


const createWindow = () => {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });


  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.loadFile('dist/index.html');
};


app.whenReady().then(async () => {
  createWindow();
});


app.once('window-all-closed', () => app.quit());


ipcMain.handle("testControl", (event: Electron.IpcMainInvokeEvent, displayName: string, data: ControlData) => {
    if (data.move?.x != undefined && data.move?.y != undefined) {
        try {
            //console.log("try: "+data.move.x +" :"+ data.move.y);
            xtest.testMotionEvent(displayName, data.move.x, data.move.y)
        } catch (error) {
            console.error(error);
        }
    }
    else if (data.button?.buttonMask != undefined && data.button.down != undefined){
        try {
            //console.log("try: " + data.button.buttonMask + " : " + data.button.down);
            xtest.testButtonEvent(displayName, data.button.buttonMask, data.button.down)
        } catch (error) {
            console.error(error);
        }
    }
    else if (data.key?.keySim != undefined && data.key.down != undefined){
        try {
            //console.log("try: " + data.key.keySim + " : " + data.key.down);
            xtest.testKeyEvent(displayName, data.key.keySim, data.key.down);
        } catch (error) {
            console.error(error);
        }
    }
  }
);

ipcMain.handle("getScreenshot", (event: Electron.IpcMainInvokeEvent, displayName: string) => {
    try{
        const img = screenshot.screenshot(displayName);
        const [width, height, depth, fb_bpp] = screenshot.getScreenInfo(displayName);
        if(width && height && depth && fb_bpp){
            const imgJpeg = converter.convert(img, width, height, depth, fb_bpp);
            return imgJpeg;   
        }
    }catch(err){
        console.log(err);
        return undefined;
    }
  }
);

ipcMain.handle("getFullScreenshot", (event: Electron.IpcMainInvokeEvent, displayName: string) => {
    try{
        const img = screenshot.screenshotFull(displayName);
        const [width, height, depth, fb_bpp] = screenshot.getScreenInfo(displayName);
        if(width && height && depth && fb_bpp){
            const imgJpeg = converter.convert(img, width, height, depth, fb_bpp);
            return imgJpeg;   
        }
    }catch(err){
        console.log(err);
        return undefined;
    }
  }
);

ipcMain.handle("startApp", (event: Electron.IpcMainInvokeEvent, displayNum: number) => {
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

        return true;
    }
    return false;
  }
);

ipcMain.handle("getAudio", (event: Electron.IpcMainInvokeEvent, pulseAudioDevice: number, data: AudioData) => {
    let command: string|undefined = undefined;

    if (data.ip_addr && data.rtp && !(data.rtcp) && !(data.srtpParameters)){
    command = `ffmpeg -f pulse -i ${pulseAudioDevice} -map 0:a:0 -acodec libopus -ab 128k -ac 2 -ar 48000 -ssrc 11111111 -payload_type 101 -f rtp rtp://${data.ip_addr}:${data.rtp}`;

    } else if (data.ip_addr && data.rtp && data.rtcp && !(data.srtpParameters)) {
        command = `ffmpeg -f pulse -i ${pulseAudioDevice} -map 0:a:0 -acodec libopus -ab 128k -ac 2 -ar 48000 -ssrc 11111111 -payload_type 101 -f rtp rtp://${data.ip_addr}:${data.rtp}?rtcpport=${data.rtcp}`;

    } else if (data.ip_addr && data.rtp && !(data.rtcp) && data.srtpParameters) {
        command = `ffmpeg -f pulse -i ${pulseAudioDevice} -map 0:a:0 -acodec libopus -ab 128k -ac 2 -ar 48000 -ssrc 11111111 -payload_type 101 -f rtp -srtp_out_suite ${data.srtpParameters.cryptoSuite} -srtp_out_params ${data.srtpParameters.keyBase64} srtp://${data.ip_addr}:${data.rtp}`;

    } else if (data.ip_addr && data.rtp && data.rtcp && data.srtpParameters){
        command = `ffmpeg -f pulse -i ${pulseAudioDevice} -map 0:a:0 -acodec libopus -ab 128k -ac 2 -ar 48000 -ssrc 11111111 -payload_type 101 -f rtp -srtp_out_suite ${data.srtpParameters.cryptoSuite} -srtp_out_params ${data.srtpParameters.keyBase64} srtp://${data.ip_addr}:${data.rtp}?rtcpport=${data.rtcp}`;
    }

    if(command){
        //console.log(command);
        return exec(command).pid;
    }
    return undefined;
  }
);

ipcMain.handle("stopAudio", (event: Electron.IpcMainInvokeEvent, ffmpegPid: number) => {
    try {
        process.kill(ffmpegPid + 1);
        process.kill(ffmpegPid);
        console.log("delete ffmpeg process Id: " + ffmpegPid + ", " + (ffmpegPid + 1));
    } catch (error) {
        console.log(error);
    }
  }
);

const getIpAddress = (): string | undefined => {
    const nets = networkInterfaces();
    const net = nets["eth0"]?.find((v) => v.family == "IPv4");
    return net ? net.address : undefined;
}
ipcMain.handle("getAddress", (event: Electron.IpcMainInvokeEvent) => {
    const ip_addr = getIpAddress()?? "127.0.0.1"; // --- IP Address
    return ip_addr;
  }
);

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault()
    callback(true)
});
