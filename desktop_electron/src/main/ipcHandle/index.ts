import { networkInterfaces } from "os";
import { exec } from "child_process";
import { BrowserWindow, desktopCapturer, ipcMain } from "electron";
import { xtest } from "./xvfb/x11lib";
import { AudioData, ControlData, DisplayInfo } from "../../util/type";
import { setXvfbIpcHandler } from "./xvfb";
import { setFileShareIpcHandler } from "./fileShare";

export const initIpcHandler = (mainWindow: BrowserWindow): void => {
  setXvfbIpcHandler();
  setFileShareIpcHandler(mainWindow);

  ipcMain.handle("getDisplayInfo", async () => {
    const sources = await desktopCapturer.getSources({
      types: ["window", "screen"],
    });
    const info: DisplayInfo[] = [];
    for (const source of sources) {
      info.push({ name: source.name, id: source.id });
    }
    return info;
  });

  ipcMain.handle(
    "testControl",
    (
      event: Electron.IpcMainInvokeEvent,
      displayName: string,
      data: ControlData,
    ) => {
      if (data.move?.x != undefined && data.move?.y != undefined) {
        try {
          //console.log("try: "+data.move.x +" :"+ data.move.y);
          xtest.testMotionEvent(displayName, data.move.x, data.move.y);
        } catch (error) {
          console.error(error);
        }
      } else if (
        data.button?.buttonMask != undefined &&
        data.button.down != undefined
      ) {
        try {
          //console.log("try: " + data.button.buttonMask + " : " + data.button.down);
          xtest.testButtonEvent(
            displayName,
            data.button.buttonMask,
            data.button.down,
          );
        } catch (error) {
          console.error(error);
        }
      } else if (data.key?.keySym != undefined && data.key.down != undefined) {
        try {
          //console.log("try: " + data.key.keySym + " : " + data.key.down);
          xtest.testKeyEvent(displayName, data.key.keySym, data.key.down);
        } catch (error) {
          console.error(error);
        }
      }
    },
  );

  ipcMain.handle(
    "getAudio",
    (
      event: Electron.IpcMainInvokeEvent,
      pulseAudioDevice: number,
      data: AudioData,
    ) => {
      let command: string | undefined = undefined;

      if (data.ip_addr && data.rtp && !data.rtcp && !data.srtpParameters) {
        command = `ffmpeg -f pulse -i ${pulseAudioDevice} -map 0:a:0 -acodec libopus -ab 128k -ac 2 -ar 48000 -ssrc 11111111 -payload_type 101 -f rtp rtp://${data.ip_addr}:${data.rtp}`;
      } else if (
        data.ip_addr &&
        data.rtp &&
        data.rtcp &&
        !data.srtpParameters
      ) {
        command = `ffmpeg -f pulse -i ${pulseAudioDevice} -map 0:a:0 -acodec libopus -ab 128k -ac 2 -ar 48000 -ssrc 11111111 -payload_type 101 -f rtp rtp://${data.ip_addr}:${data.rtp}?rtcpport=${data.rtcp}`;
      } else if (
        data.ip_addr &&
        data.rtp &&
        !data.rtcp &&
        data.srtpParameters
      ) {
        command = `ffmpeg -f pulse -i ${pulseAudioDevice} -map 0:a:0 -acodec libopus -ab 128k -ac 2 -ar 48000 -ssrc 11111111 -payload_type 101 -f rtp -srtp_out_suite ${data.srtpParameters.cryptoSuite} -srtp_out_params ${data.srtpParameters.keyBase64} srtp://${data.ip_addr}:${data.rtp}`;
      } else if (data.ip_addr && data.rtp && data.rtcp && data.srtpParameters) {
        command = `ffmpeg -f pulse -i ${pulseAudioDevice} -map 0:a:0 -acodec libopus -ab 128k -ac 2 -ar 48000 -ssrc 11111111 -payload_type 101 -f rtp -srtp_out_suite ${data.srtpParameters.cryptoSuite} -srtp_out_params ${data.srtpParameters.keyBase64} srtp://${data.ip_addr}:${data.rtp}?rtcpport=${data.rtcp}`;
      }

      if (command) {
        //console.log(command);
        return exec(command).pid;
      }
      return undefined;
    },
  );

  ipcMain.handle(
    "stopAudio",
    (event: Electron.IpcMainInvokeEvent, ffmpegPid: number) => {
      try {
        process.kill(ffmpegPid + 1);
        process.kill(ffmpegPid);
        console.log(
          "delete ffmpeg process Id: " + ffmpegPid + ", " + (ffmpegPid + 1),
        );
      } catch (error) {
        console.log(error);
      }
    },
  );

  ipcMain.handle("getAddress", () => {
    const ip_addr = getIpAddress() ?? "127.0.0.1"; // --- IP Address
    return ip_addr;
  });

  ipcMain.handle("getBasePath", () => {
    return `${__dirname}`;
  });
};

const getIpAddress = (): string | undefined => {
  const nets = networkInterfaces();
  const net = nets["eth0"]?.find((v) => v.family == "IPv4");
  return net ? net.address : undefined;
};
