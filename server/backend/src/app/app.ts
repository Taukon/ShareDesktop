import https from 'https';
import fs from 'fs';
import express from 'express';
import { networkInterfaces } from "os";
import {
    DtlsParameters,
    RtpCapabilities,
    RtpCodecCapability,
    WebRtcTransportOptions,
    WorkerSettings,
} from 'mediasoup/node/lib/types';
import { Server } from 'socket.io';
import { ServerWebRTC } from "../serverWebRTC";
import { 
    ConsumeDataParams, 
    ProduceDataParams, 
    RtcTransportParams 
} from '../serverWebRTC/common/type';
import * as browserType from '../serverWebRTC/browser/type';
import * as desktopType from '../serverWebRTC/desktop/type';


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

const enableAudio = true;

const transportOption: WebRtcTransportOptions = {
    listenIps: [
        {
            ip: ip_addr
        },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
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

const serverWebRtc = new ServerWebRTC(
    limitDesktop,
    limitClient, 
    transportOption, 
    workerSettings, 
    mediaCodecs, ip_addr
);

type Callback<T> = (res: T) => void;

clientServer.on('connection', sock => {

    sock.on('getRtpCapabilities', async (desktopId: string, callback: Callback<RtpCapabilities>) => {
        const dropId = serverWebRtc.verifyTotalBrowser();
        if(dropId){
            clientServer.to(dropId).emit("end");
        }
        const params = await serverWebRtc.getRtpCapabilitiesForBrowser(sock.id, desktopId, enableAudio);
        if (params) {
            callback(params);
        }
    });

    sock.on('createMediaControl', async (desktopId: string, callback: Callback<RtcTransportParams>) => {
        const params = await serverWebRtc.createBrowserControl(sock.id, desktopId);
        if (params) {
            callback(params);
        }
    });

    sock.on('connectMediaControl', async (
        req: {desktopId: string, dtlsParameters: DtlsParameters}, 
        callback: Callback<true>
    ) => {
        const params = await serverWebRtc.connectBrowserControl(sock.id, req.desktopId, req.dtlsParameters);
        if (params) {
            callback(params);
        }
    });

    sock.on('establishMediaControl', async (
        req: {desktopId: string, produceParameters: ProduceDataParams}, 
        callback: Callback<string>
    ) => {
        const params = await serverWebRtc.establishBrowserControl(sock.id, req.desktopId, req.produceParameters);
        if (params) {
            callback(params);
        }
    });

    sock.on('createMediaScreenOrAudio', async (
        req: {desktopId: string, isAudio: boolean}, 
        callback: Callback<RtcTransportParams>
    ) => {
        const params = await serverWebRtc.createBrowserScreenOrAudio(sock.id, req.desktopId, req.isAudio);
        if (params) {
            callback(params);
        }
    });

    sock.on('connectMediaScreenOrAudio', async (
        req: {
            desktopId: string, 
            dtlsParameters: DtlsParameters, 
            isAudio: boolean
        },
        callback: Callback<true>
    ) => {
        const params = await serverWebRtc.connectBrowserScreenOrAudio(sock.id, req.desktopId, req.dtlsParameters, req.isAudio);
        if (params) {
            callback(params);
        }
    });

    sock.on('establishMediaScreen', async (desktopId: string, callback: Callback<ConsumeDataParams>) => {
        const params = await serverWebRtc.establishBrowserScreen(sock.id, desktopId);
        if (params) {
            callback(params);
        }
    });

    sock.on('establishMediaAudio', async (
        req: {
            desktopId: string, 
            rtpCapabilities: RtpCapabilities
        }, 
        callback: Callback<browserType.AudioResponse>
    ) => {
        const params = await serverWebRtc.establishBrowserAudio(sock.id, req.desktopId, req.rtpCapabilities);
        if (params) {
            callback(params);
        }
    });

    sock.on("disconnect", () => {
        serverWebRtc.disconnectBrowserClient(sock.id);
    });
});


desktopServer.on('connection', sock => {

    console.log(`desktopId: ${sock.id}`);
    sock.emit('desktopId', sock.id);

    sock.on('getRtpCapabilities', async (desktopId: string, callback: Callback<RtpCapabilities>) => {
        const dropId = serverWebRtc.verifyTotalDesktop();
        if(dropId){
            desktopServer.to(dropId).emit("end");
        }
        const params = await serverWebRtc.getRtpCapabilitiesForDesktop(desktopId, enableAudio);
        if (params) {
            callback(params);
        }
    });

    sock.on('createDesktopControl', async (desktopId: string, callback: Callback<RtcTransportParams>) => {
        const params = await serverWebRtc.createDesktopControl(desktopId);
        if (params) {
            callback(params);
        }
    });

    sock.on('connectDesktopControl', async (
        req: {desktopId: string, dtlsParameters: DtlsParameters}, 
        callback: Callback<true>
    ) => {
        const params = await serverWebRtc.connectDesktopControl(req.desktopId, req.dtlsParameters);
        if (params) {
            callback(params);
        }
    });

    sock.on('establishDesktopControl', async (desktopId: string, callback: Callback<ConsumeDataParams>) => {
        const params = await serverWebRtc.establishDesktopControl(desktopId);
        if (params) {
            callback(params);
        }
    });

    sock.on('createDesktopScreen', async (desktopId: string, callback: Callback<RtcTransportParams>) => {
        const params = await serverWebRtc.createDesktopScreen(desktopId);
        if (params) {
            callback(params);
        }
    });

    sock.on('connectDesktopScreen', async (
        req: {
            desktopId: string, 
            dtlsParameters: DtlsParameters
        },
        callback: Callback<true>
    ) => {
        const params = await serverWebRtc.connectDesktopScreen(req.desktopId, req.dtlsParameters);
        if (params) {
            callback(params);
        }
    });

    sock.on('establishDesktopScreen', async (
        req: {desktopId: string, produceParameters: ProduceDataParams},
        callback: Callback<string>
    ) => {
        const params = await serverWebRtc.establishDesktopScreen(req.desktopId, req.produceParameters);
        if (params) {
            callback(params);
        }
    });

    sock.on('establishDesktopAudio', async (
        desktopId: string, 
        callback: Callback<desktopType.AudioResponse>
    ) => {
        if(await serverWebRtc.createDesktopAudio(desktopId, false)){
            const params = serverWebRtc.establishDesktopAudio(desktopId);
            if (params) {
                callback(params);
            }
        }
    });

    sock.on("disconnect", () => {
        serverWebRtc.disconnectDesktop(sock.id);
    });
});
