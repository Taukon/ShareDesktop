import path from 'path';
import { app, BrowserWindow, ipcMain } from "electron";

// import bindings from 'bindings';
// const screenshot = bindings('screenshot');
// const converter = bindings('converter');
// const xtest = bindings('xtest');

import {screenshot, converter, xtest} from "./x11lib";

//import { ChildProcess, exec } from "child_process";

import { Xvfb } from './xvfb';
import { AppProcess } from './appProcess';
import { networkInterfaces } from "os";


/**
 * BrowserWindowインスタンスを作成する関数
 */
const createWindow = () => {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // 開発時にはデベロッパーツールを開く
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // レンダラープロセスをロード
  mainWindow.loadFile('dist/index.html');
};

/**
 * アプリを起動する準備が完了したら BrowserWindow インスタンスを作成し、
 * レンダラープロセス（index.htmlとそこから呼ばれるスクリプト）を
 * ロードする
 */
app.whenReady().then(async () => {
  // BrowserWindow インスタンスを作成
  createWindow();
});

// すべてのウィンドウが閉じられたらアプリを終了する
app.once('window-all-closed', () => app.quit());

//////
ipcMain.handle("testControl", (event: Electron.IpcMainInvokeEvent, displayName: string, data: any) => {
    if (data.move?.x != undefined && data.move?.y != undefined) {
        try {
            //mymoveMouse(data.move.x, data.move.y);
            //console.log("try: "+data.move.x +" :"+ data.move.y);
            xtest.testMotionEvent(displayName, data.move.x, data.move.y)
        } catch (error) {
            console.error(error);
        }
    }
    else if (data.button && "buttonMask" in data.button && "down" in data.button){
        try {
            //console.log("try: " + data.button.buttonMask + " : " + data.button.down);
            xtest.testButtonEvent(displayName, data.button.buttonMask, data.button.down)
        } catch (error) {
            console.error(error);
        }
    }
    else if (data.key && "keySim" in data.key && "down" in data.key){
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

//////

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
  
    // Prevent having error
    event.preventDefault()
    // and continue
    callback(true)

})
