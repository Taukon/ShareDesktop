import { Server, Socket } from "socket.io";
import { DtlsParameters, RtpCapabilities } from "mediasoup/node/lib/types";
import { ServerWebRTC } from "../serverWebRTC";
import { 
    ConsumeDataParams, 
    ProduceDataParams, 
    RtcTransportParams 
} from "../serverWebRTC/common/type";
import { SignalingEventEmitter } from "./signalingEvent";
import { Callback } from "./type";
import * as browserType from '../serverWebRTC/browser/type';

export const setSignalingBrowser = (
    clientServer: Server,
    socket: Socket,
    serverWebRTC: ServerWebRTC,
    fileEventEmitter: SignalingEventEmitter,
    enableAudio: boolean
): void => {
    socket.on('getRtpCapabilities', async (desktopId: string, callback: Callback<RtpCapabilities>) => {
        //console.log(`getRtpCapabilities`);
        const dropId = serverWebRTC.verifyTotalBrowser();
        if(dropId){
            clientServer.to(dropId).emit("end");
        }
        const params = await serverWebRTC.getRtpCapabilitiesForBrowser(socket.id, desktopId, enableAudio);
        //console.log(params);
        if (params) {
            callback(params);
        }
    });

    socket.on('createMediaControl', async (desktopId: string, callback: Callback<RtcTransportParams>) => {
        //console.log(`createMediaControl`);
        const params = await serverWebRTC.createBrowserControl(socket.id, desktopId);
        //console.log(params);
        if (params) {
            callback(params);
        }
    });

    socket.on('connectMediaControl', async (
        req: {desktopId: string, dtlsParameters: DtlsParameters}, 
        callback: Callback<true>
    ) => {
        //console.log(`connectMediaControl`);
        const params = await serverWebRTC.connectBrowserControl(socket.id, req.desktopId, req.dtlsParameters);
        if (params) {
            callback(params);
        }
    });

    socket.on('establishMediaControl', async (
        req: {desktopId: string, produceParameters: ProduceDataParams}, 
        callback: Callback<string>
    ) => {
        //console.log(`establishMediaControl`);
        const params = await serverWebRTC.establishBrowserControl(socket.id, req.desktopId, req.produceParameters);
        //console.log(params);
        if (params) {
            callback(params);
        }
    });

    socket.on('createMediaScreenOrAudio', async (
        req: {desktopId: string, isAudio: boolean}, 
        callback: Callback<RtcTransportParams>
    ) => {
        //console.log(`createMediaScreenOrAudio`);
        const params = await serverWebRTC.createBrowserScreenOrAudio(socket.id, req.desktopId, req.isAudio);
        //console.log(params);
        if (params) {
            callback(params);
        }
    });

    socket.on('connectMediaScreenOrAudio', async (
        req: {
            desktopId: string, 
            dtlsParameters: DtlsParameters, 
            isAudio: boolean
        },
        callback: Callback<true>
    ) => {
        const params = await serverWebRTC.connectBrowserScreenOrAudio(socket.id, req.desktopId, req.dtlsParameters, req.isAudio);
        if (params) {
            callback(params);
        }
    });

    socket.on('establishMediaScreen', async (
        desktopId: string, 
        callback: Callback<ConsumeDataParams>
    ) => {
        const params = await serverWebRTC.establishBrowserScreen(socket.id, desktopId);
        if (params) {
            callback(params);
        }
    });

    socket.on('establishMediaAudio', async (
        req: {
            desktopId: string, 
            rtpCapabilities: RtpCapabilities
        }, 
        callback: Callback<browserType.AudioResponse>
    ) => {
        const params = await serverWebRTC.establishBrowserAudio(socket.id, req.desktopId, req.rtpCapabilities);
        if (params) {
            callback(params);
        }
    });

    socket.on('createFileWatch', async (
        desktopId: string, 
        callback: Callback<RtcTransportParams>
    ) => {
        const params = await serverWebRTC.createBrowserFileWatch(socket.id, desktopId);
        //console.log(params);
        if (params) {
            callback(params);
        }
    });

    socket.on('connectFileWatch', async (
        req: {
            desktopId: string, 
            dtlsParameters: DtlsParameters
        },
        callback: Callback<true>
    ) => {
        const params = await serverWebRTC.connectBrowserFileWatch(socket.id, req.desktopId, req.dtlsParameters);
        if (params) {
            callback(params);
        }
    });

    socket.on('establishFileWatch', async (
        desktopId: string, 
        callback: Callback<ConsumeDataParams>
    ) => {
        const params = await serverWebRTC.establishBrowserFileWatch(socket.id, desktopId);
        if (params) {
            callback(params);
        }
    });

    socket.on("disconnect", () => {
        serverWebRTC.disconnectBrowserClient(socket.id);
    });

    // -------------- File Transfer --------------
    // Send FIle from Desktop to Browser
    socket.on('initRecvFileTransfer', async (
        desktopId: string,
        callback: Callback<{fileTransferId: string, fileName: string, fileSize: number}>
    ) => {
        const params = serverWebRTC.initFileTransfer();
        console.log(`init recv ${params}`);
        if(params){
            console.log(`desktopID: ${desktopId}`);
            fileEventEmitter.requestSendFile(desktopId, params); 
            fileEventEmitter.waitFileProducer(params, callback); //p(D)=>c(B)
        }
    });

    // Send FIle from Browser to Desktop
    socket.on('initSendFileTransfer', async (
        desktopId: string,
        callback: Callback<string>
    ) => {
        const params = serverWebRTC.initFileTransfer();
        if(params){
            callback(params); //->waitFileConsumer
            fileEventEmitter.requestRecvFile(desktopId, params); //p(B)=>c(D)
        }
    });

    socket.on('endTransferFile', (
        fileTransferId: string
    ) => {
        return serverWebRTC.disconnectFileTransfer(fileTransferId);
    });

    socket.on('createSendFile', async (
        fileTransferId: string,
        callback: Callback<RtcTransportParams>
    ) => {
        const params = await serverWebRTC.createSendFile(fileTransferId);
        if(params){
            callback(params);
        }
    });

    socket.on('connectSendFile', async (
        req: {
            fileTransferId: string,
            dtlsParameters: DtlsParameters
        },
        callback: Callback<true>
    ) => {
        const params = await serverWebRTC.connectSendFile(req.fileTransferId, req.dtlsParameters);
        if(params){
            callback(params);
        }
    });

    socket.on('establishSendFile', async (
        req: {
            fileTransferId: string,
            produceParameters: ProduceDataParams
        },
        callback: Callback<string>
    ) => {
        const params = await serverWebRTC.establishSendFile(req.fileTransferId, req.produceParameters);
        if(params){
            callback(params);
        }
    });

    // for produce send
    socket.on('waitFileConsumer', async (
        req: {
            fileTransferId: string,
            fileName: string,
            fileSize: number
        },
        callback: Callback<string>
    ) => {
        fileEventEmitter.setFileProducer(req.fileTransferId, req.fileName, req.fileSize); //p(B)=>c(D)
        fileEventEmitter.waitFileConsumer(req.fileTransferId, callback); //c(D)=>p(B)
    });

    socket.on('createRecvFile', async (
        fileTransferId: string,
        callback: Callback<RtcTransportParams>
    ) => {
        const params = await serverWebRTC.createRecvFile(fileTransferId);
        console.log(`createRecvFile ${params}`);
        if(params){
            callback(params);
        }
    });

    socket.on('connectRecvFile', async (
        req: {
            fileTransferId: string,
            dtlsParameters: DtlsParameters
        },
        callback: Callback<true>
    ) => {
        const params = await serverWebRTC.connectRecvFile(req.fileTransferId, req.dtlsParameters);
        console.log(`connectRecvFile ${params}`);
        if(params){
            callback(params);
        }
    });

    socket.on('establishRecvFile', async (
        fileTransferId: string,
        callback: Callback<ConsumeDataParams>
    ) => {
        console.log(`establishRecvFile ID ${fileTransferId}`);
        const params = await serverWebRTC.establishRecvFile(fileTransferId);
        console.log(`establishRecvFile ${params}`);
        if(params){
            callback(params);
        }
    });

    socket.on('setFileConsumer', async (
        fileTransferId: string
    ) => {
        console.log(`setFileConsumer`);
        fileEventEmitter.setFileConsumer(fileTransferId); //c(B)=>p(D)
    });
}