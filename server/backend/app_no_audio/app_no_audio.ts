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
import { serverRtc } from "../lib/index.js";


//import { exec } from "child_process";
//exec("node desktop/desktop_server.mjs 5900");

const getIpAddress = (): string | undefined => {
    const nets = networkInterfaces();
    const net = nets["eth0"]?.find((v) => v.family == "IPv4");
    return net ? net.address : undefined;
}


const MinPort = 2000;   // --- RtcMinPort
const MaxPort = 2020;   // --- RtcMaxport
const limitClient = 2;
const limitDesktop = 2;

const clientPort = 3000;  // --- https Port for client
const desktopPort = 3100;  // --- https Port for desktop

const ip_addr = getIpAddress()?? "127.0.0.1"; // --- IP Address

const enableAudio = false;

const transportOption: WebRtcTransportOptions = {
    listenIps: [
        {
            ip: ip_addr
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

// --- WebSocket Server For Client ---
const httpsServerForClient = https.createServer(options, app);
httpsServerForClient.listen(clientPort, () => {
    console.log('https://' + ip_addr + ':' + clientPort + '/webRTC_client.html');
});
const clientServer = new Server(httpsServerForClient);

// --- WebSocket Server For Desktop ---
const httpsServerForDesktop = https.createServer(options, app);
httpsServerForDesktop.listen(desktopPort, () => {
    console.log('https://' + ip_addr + ':' + desktopPort + '  <-- desktop server');
});
const desktopServer = new Server(httpsServerForDesktop);


// --- MediaSoup Server ---

const serverWebRtc = new serverRtc(
    limitClient, 
    limitDesktop,
    transportOption, 
    workerSettings, 
    mediaCodecs, 
    ip_addr
);

clientServer.on('connection', sock => {

    sock.on('getRtpCapabilities', async (desktopId: string, callback: any) => {
        //console.log(`getRtpCapabilities`);
        const dropId = serverWebRtc.checkClientTotal();
        if(dropId){
            clientServer.to(dropId).emit("end");
        }
        const params = await serverWebRtc.getRtpCapabilitiesForClient(sock.id, desktopId, enableAudio);
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

desktopServer.on('connection', sock => {

    console.log(`desktopId: ${sock.id}`);
    sock.emit('desktopId', sock.id);

    sock.on('getRtpCapabilities', async (desktopId: string, callback: any) => {
        const dropId = serverWebRtc.checkDesktopTotal();
        if(dropId){
            desktopServer.to(dropId).emit("end");
        }
        const params = await serverWebRtc.getRtpCapabilitiesForDesktop(desktopId, enableAudio);
        if (params) {
            callback(params);
        }
    });

    sock.on('createDesktopControl', async (desktopId: string, callback: any) => {
        const params = await serverWebRtc.createDesktopControl(desktopId);
        if (params) {
            callback(params);
        }
    });

    sock.on('connectDesktopControl', async (
        req: {desktopId: string, dtlsParameters: DtlsParameters}, 
        callback: any
    ) => {
        const params = await serverWebRtc.connectDesktopControl(req.desktopId, req.dtlsParameters);
        if (params) {
            callback(params);
        }
    });

    sock.on('establishDesktopControl', async (desktopId: string, callback: any) => {
        const params = await serverWebRtc.establishDesktopControl(desktopId);
        if (params) {
            callback(params);
        }
    });

    sock.on('createDesktopScreen', async (desktopId: string, callback: any) => {
        const params = await serverWebRtc.createDesktopScreen(desktopId);
        if (params) {
            callback(params);
        }
    });

    sock.on('connectDesktopScreen', async (
        req: {
            desktopId: string, 
            dtlsParameters: mediasoupClientType.DtlsParameters
        },
        callback: any
    ) => {
        const params = await serverWebRtc.connectDesktopScreen(req.desktopId, req.dtlsParameters);
        if (params) {
            callback(params);
        }
    });

    sock.on('establishDesktopScreen', async (
        req: {desktopId: string, produceParameters: any},
        callback: any
    ) => {
        const params = await serverWebRtc.establishDesktopScreen(req.desktopId, req.produceParameters);
        if (params) {
            callback(params);
        }
    });

    sock.on("disconnect", () => {
        serverWebRtc.disconnectDesktop(sock.id);
    });
});
