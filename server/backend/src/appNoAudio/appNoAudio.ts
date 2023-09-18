import fs from "fs";
import https from "https";
import { networkInterfaces } from "os";
import express from "express";
import {
  type RtpCodecCapability,
  type WebRtcTransportOptions,
  type WorkerSettings,
} from "mediasoup/node/lib/types";
import { Server } from "socket.io";
import { UserManage } from "../userManage";
import { initServerShare } from "../serverShare";
import { signalingBrowser, signalingDesktop } from "../signaling";

const getIpAddress = (): string | undefined => {
  const nets = networkInterfaces();
  const net = nets["eth0"]?.find((v) => v.family == "IPv4");
  return net != null ? net.address : undefined;
};

const MinPort = 2000; // --- RtcMinPort
const MaxPort = 2050; // --- RtcMaxport

const clientPort = 3000; // --- https Port for client
const desktopPort = 3100; // --- https Port for desktop

const ip_addr = getIpAddress() ?? "127.0.0.1"; // --- IP Address

const transportOption: WebRtcTransportOptions = {
  listenIps: [
    {
      ip: ip_addr,
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
};

const mediaCodecs: RtpCodecCapability[] = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
];

// --- HTTPS Server ---
const app: express.Express = express();

app.use(express.static("../public"));

// --- SSL cert for HTTPS access ---
const options = {
  key: fs.readFileSync("../ssl/key.pem", "utf-8"),
  cert: fs.readFileSync("../ssl/cert.pem", "utf-8"),
};

// --- WebSocket Server For Client ---
const httpsServerForClient = https.createServer(options, app);
httpsServerForClient.listen(clientPort, () => {
  console.log(
    "https://" + ip_addr + ":" + clientPort + "/webRTC_client_no_audio.html",
  );
});
const clientServer = new Server(httpsServerForClient);

// --- WebSocket Server For Desktop ---
const httpsServerForDesktop = https.createServer(options, app);
httpsServerForDesktop.listen(desktopPort, () => {
  console.log(
    "https://" + ip_addr + ":" + desktopPort + "  <-- desktop server",
  );
});
const desktopServer = new Server(httpsServerForDesktop);

const start = async () => {
  const limitAppDtp = 2;
  const limitAppBro = 2;
  const limitFileDtp = 2;
  const limitFileBro = 2;
  const limitFileTrf = 5;

  // --- MediaSoup Server ---
  const { shareApp, shareFile } = await initServerShare(
    limitAppDtp,
    limitAppBro,
    limitFileDtp,
    limitFileBro,
    limitFileTrf,
    transportOption,
    workerSettings,
    mediaCodecs,
  );

  const userTable = new UserManage();

  clientServer.on("connection", (sock) => {
    signalingBrowser(desktopServer, sock, shareApp, shareFile, userTable);
  });

  desktopServer.on("connection", (sock) => {
    console.log(`desktopId: ${sock.id}`);
    signalingDesktop(
      desktopServer,
      clientServer,
      sock,
      shareApp,
      shareFile,
      userTable,
    );
  });
};

start();
