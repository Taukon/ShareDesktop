import path from 'path';
import { app, BrowserWindow, ipcMain } from "electron";
import { initIpcHandler } from './ipcHandle';


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

initIpcHandler();

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault()
    callback(true)
});
