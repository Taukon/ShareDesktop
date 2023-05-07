// sudo apt install libx11-dev libjpeg-dev libxtst-dev

import { loadWrtc } from './wrtc.js';

loadWrtc();

// Polyfills
/*
import fetch from "node-fetch";

// @ts-ignore
import wrtc from "wrtc";
declare global {
  interface Window {
    RTCPeerConnectionStatic: typeof wrtc.RTCPeerConnection;
    RTCSessionDescription: typeof wrtc.RTCSessionDescription;
    fetch: typeof fetch;
  }
}*/


import geckos, { ClientChannel } from '@geckos.io/client'

import bindings from 'bindings';
const screenshot = bindings('screenshot');
const converter = bindings('converter');
const xtest = bindings('xtest');
import { exec } from "child_process";

import { networkInterfaces } from "os";
const getIpAddress = (): string | undefined => {
  const nets = networkInterfaces();
  const net = nets["eth0"]?.find((v) => v.family == "IPv4");
  return net ? net.address : undefined;
}

const ip_addr = getIpAddress(); // --- IP Address
const geckosPort = 4000; // --- https Port for geckos

let preImg = Buffer.alloc(0);   // --- Screen Image Buffer jpeg 

const interval = 100;//300;
let intervalId: any;

let ffmpegPS: any;   // ---ffmpeg process
// --- for ffmpeg
const pulseAudioDevice = 1;
// --- end ffmpeg

const channel = geckos({url: `https://${ip_addr}`, port: geckosPort}) // default port is 9208

channel.onConnect(error => {

  console.log(`id: ${channel.id}`);

  // ----- keyboard ----------
  channel.on('data', msg => {

    const buf = Buffer.from(msg as ArrayBuffer);
    const data = JSON.parse(buf.toString());

    if (data.move) {
      try {
          //mymoveMouse(data.move.x, data.move.y);
          //console.log("try: "+data.move.x +" :"+ data.move.y);
          xtest.testMotionEvent(data.move.x, data.move.y)
      } catch (error) {
          console.error(error);
      }
    }
    else if (data.button){
        try {
            //console.log("try: " + data.button.buttonMask + " : " + data.button.down);
            xtest.testButtonEvent(data.button.buttonMask, data.button.down)
        } catch (error) {
            console.error(error);
        }
    }
    else if (data.key){
        try {
            //console.log("try: " + data.key.keySim + " : " + data.key.down);
            xtest.testKeyEvent(data.key.keySim, data.key.down);
        } catch (error) {
            console.error(error);
        }
    }
  });
  // -------------------------------------

  // ----------- audio -------------
  channel.on('audio', data => {
    const buf = Buffer.from(data as ArrayBuffer);
    const msg = JSON.parse(buf.toString());

    //const msg = JSON.parse(data.toString());
    console.log(msg);

    let command: string|undefined = undefined;

    if (msg.ip_addr && msg.rtp && !(msg.rtcp) && !(msg.srtpParameters)){
      command = `ffmpeg -f pulse -i ${pulseAudioDevice} -map 0:a:0 -acodec libopus -ab 128k -ac 2 -ar 48000 -ssrc 11111111 -payload_type 101 -f rtp rtp://${msg.ip_addr}:${msg.rtp}`;

    } else if (msg.ip_addr && msg.rtp && msg.rtcp && !(msg.srtpParameters)) {
        command = `ffmpeg -f pulse -i ${pulseAudioDevice} -map 0:a:0 -acodec libopus -ab 128k -ac 2 -ar 48000 -ssrc 11111111 -payload_type 101 -f rtp rtp://${msg.ip_addr}:${msg.rtp}?rtcpport=${msg.rtcp}`;

    } else if (msg.ip_addr && msg.rtp && !(msg.rtcp) && msg.srtpParameters) {
        command = `ffmpeg -f pulse -i ${pulseAudioDevice} -map 0:a:0 -acodec libopus -ab 128k -ac 2 -ar 48000 -ssrc 11111111 -payload_type 101 -f rtp -srtp_out_suite ${msg.srtpParameters.cryptoSuite} -srtp_out_params ${msg.srtpParameters.keyBase64} srtp://${msg.ip_addr}:${msg.rtp}`;

    } else if (msg.ip_addr && msg.rtp && msg.rtcp && msg.srtpParameters){
        command = `ffmpeg -f pulse -i ${pulseAudioDevice} -map 0:a:0 -acodec libopus -ab 128k -ac 2 -ar 48000 -ssrc 11111111 -payload_type 101 -f rtp -srtp_out_suite ${msg.srtpParameters.cryptoSuite} -srtp_out_params ${msg.srtpParameters.keyBase64} srtp://${msg.ip_addr}:${msg.rtp}?rtcpport=${msg.rtcp}`;
    }

    if(command){
        console.log(command);
        ffmpegPS = exec(command);
    }

  });

  channel.onDisconnect(() => {
    console.log(`${channel.id} got disconnected`);

    if (ffmpegPS != null) {
      try {
          const pid = ffmpegPS.pid;
          process.kill(pid + 1);
          process.kill(pid);
          console.log("delete ffmpeg process Id: " + pid + ", " + (pid + 1));
      } catch (error) {
          console.log(error);
      }
    }

    console.log("disconnect clear intervalId: " + intervalId);
    clearInterval(intervalId);
  });

  //sendFullScreen(channel);
  sendScreen(channel);

});

export async function sendScreen(channel: ClientChannel) {


  let data = {
      width: screenshot.getWidth(),
      height: screenshot.getHeight(),
      depth: screenshot.getDepth(),
      fb_bpp: screenshot.getFb_bpp()
  };

  intervalId = setInterval(() => {
      try{
          const img = screenshot.screenshot();

          if (Buffer.compare(img, preImg) != 0) {
              data = {
                  width: screenshot.getWidth(),
                  height: screenshot.getHeight(),
                  depth: screenshot.getDepth(),
                  fb_bpp: screenshot.getFb_bpp()
              };

              const imgJpeg = converter.convert(img, data.width, data.height, data.depth, data.fb_bpp);
              channel.raw.emit(imgJpeg);
              preImg = Buffer.from(img.buffer);
          }
      }catch(err){
          console.log(err);
      }

  }, interval);
}

export async function sendFullScreen(channel: ClientChannel) {

  let data = {
      width: screenshot.getWidthFull(),
      height: screenshot.getHeightFull(),
      depth: screenshot.getDepthFull(),
      fb_bpp: screenshot.getFb_bppFull()
  };
  //socket.emit("screenData", data);

  intervalId = setInterval(() => {
      try {
          const img = screenshot.screenshotFull();

          if (Buffer.compare(img, preImg) != 0) {
              data = {
                  width: screenshot.getWidthFull(),
                  height: screenshot.getHeightFull(),
                  depth: screenshot.getDepthFull(),
                  fb_bpp: screenshot.getFb_bppFull()
              };

              const imgJpeg = converter.convert(img, data.width, data.height, data.depth, data.fb_bpp);
              channel.raw.emit(imgJpeg);
              //dataProducer.send(img);
              preImg = Buffer.from(img.buffer);
          }
      } catch (err) {
          console.log(err);
      }

  }, interval);
}