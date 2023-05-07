import https from 'https';
import fs from 'fs';
import express from 'express';
import { networkInterfaces } from "os";
import {
    DtlsParameters,
    RtpCodecCapability,
    WebRtcTransportOptions,
    WorkerSettings,
} from 'mediasoup/node/lib/types';
import * as mediasoupClientType from "mediasoup-client/lib/types";
import { Server } from 'socket.io';
import geckos from '@geckos.io/server';
import { serverRtc } from "../lib/index.js";


//import { exec } from "child_process";
//exec("node desktop/desktop_server.mjs 5900");

const getIpAddress = (): string | undefined => {
    const nets = networkInterfaces();
    const net = nets["eth0"]?.find((v) => v.family == "IPv4");
    return net ? net.address : undefined;
}


const MinPort = 2000;   // --- RtcMinPort
const MaxPort = 2010;   // --- RtcMaxport
const limitClient = 2;

const ioPort = 3000;  // --- https Port for IO
const geckosPort = 4000; // --- https Port for geckos

const ip_addr = getIpAddress(); // --- IP Address

const enableAudio = false;

const transportOption: WebRtcTransportOptions = {
    listenIps: [
        {
            ip: ip_addr ?? "127.0.0.1"
        },
    ],
    enableSctp: true,
};

const workerSettings: WorkerSettings = {
    rtcMinPort: MinPort,
    rtcMaxPort: MaxPort,
}

const mediaCodecs: RtpCodecCapability[] = [
    {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
    }
];

// --- HTTPS Server ---
const app: express.Express = express();

app.use(express.static('../public'));

// --- SSL cert for HTTPS access ---
const options = {
    key: fs.readFileSync('../ssl/key.pem', 'utf-8'),
    cert: fs.readFileSync('../ssl/cert.pem', 'utf-8')
}

// --- WebSocket Server ---
const httpsServerForIO = https.createServer(options, app);
httpsServerForIO.listen(ioPort, () => {
    console.log('https://' + ip_addr + ':' + ioPort + '/webRTC_client_no_audio.html');
});
const ioServer = new Server(httpsServerForIO);

// --- geckos Server ---
const httpsServerForGeckos = https.createServer(options, app);
const geckosServer = geckos();
geckosServer.addServer(httpsServerForGeckos);
httpsServerForGeckos.listen(geckosPort, () => {
    console.log('https://' + ip_addr + ':' + geckosPort);
});

// --- MediaSoup Server ---

const serverWebRtc = new serverRtc(limitClient, transportOption, workerSettings, mediaCodecs, ip_addr ?? "127.0.0.1");

geckosServer.onConnection(channel => {

    console.log(`geckos id: ${channel.id}`);

    if(channel.id){
        const desktopId = channel.id;
        serverWebRtc.createDesktopTransports(desktopId, channel, enableAudio, false).then(() => {
            serverWebRtc.establishDesktopScreenAudio(desktopId, enableAudio);
        });
        //serverWebRtc.establishDesktopScreenAudio(channel.id, enableAudio);
    }

    channel.onDisconnect(() => {
        console.log(`${channel.id} got disconnected`)
        serverWebRtc.disconnectDesktop(channel.id ?? "");
    });
});

ioServer.on('connection', sock => {

    sock.on('getRtpCapabilities', async (desktopId: string, callback: any) => {
        //console.log(`getRtpCapabilities`);
        const params = await serverWebRtc.getRtpCapabilities(sock.id, desktopId, ioServer, false);
        //console.log(params);
        if (params) {
            callback(params);
        }
    });

    sock.on('createMediaControl', async (desktopId: string, callback: any) => {
        //console.log(`createMediaControl`);
        const params = await serverWebRtc.createMediaControl(sock.id, desktopId);
        //console.log(params);
        if (params) {
            callback(params);
        }
    });

    sock.on('connectMediaControl', async (
        req: {desktopId: string, dtlsParameters: DtlsParameters}, 
        callback: any
    ) => {
        //console.log(`connectMediaControl`);
        const params = await serverWebRtc.connectMediaControl(sock.id, req.desktopId, req.dtlsParameters);
        if (params) {
            callback(params);
        }
    });

    sock.on('establishMediaControl', async (
        req: {desktopId: string, produceParameters: any}, 
        callback: any
    ) => {
        //console.log(`establishMediaControl`);
        const params = await serverWebRtc.establishMediaControl(sock.id, req.desktopId, req.produceParameters);
        //console.log(params);
        if (params) {
            callback(params);
        }
    });

    sock.on('createMediaScreenOrAudio', async (
        req: {desktopId: string, isAudio: boolean}, 
        callback: any
    ) => {
        //console.log(`createMediaScreenOrAudio`);
        const params = await serverWebRtc.createMediaScreenOrAudio(sock.id, req.desktopId, req.isAudio);
        //console.log(params);
        if (params) {
            callback(params);
        }
    });

    sock.on('connectMediaScreenOrAudio', async (
        req: {
            desktopId: string, 
            dtlsParameters: mediasoupClientType.DtlsParameters, 
            isAudio: boolean
        },
        callback: any
    ) => {
        const params = await serverWebRtc.connectMediaScreenOrAudio(sock.id, req.desktopId, req.dtlsParameters, req.isAudio);
        if (params) {
            callback(params);
        }
    });

    sock.on('establishMediaScreen', async (desktopId: string, callback: any) => {
        const params = await serverWebRtc.establishMediaScreen(sock.id, desktopId);
        if (params) {
            callback(params);
        }
    });

    sock.on("disconnect", () => {
        serverWebRtc.disconnectMediaClient(sock.id);
    });
});
