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

export const setSignalingDesktop = (
    desktopServer: Server,
    socket: Socket,
    serverWebRTC: ServerWebRTC,
    fileEventEmitter: SignalingEventEmitter,
    enableAudio: boolean
): void =>{

    fileEventEmitter.listenRequestFile(desktopServer);
    fileEventEmitter.listenDropId(desktopServer);

    socket.emit('desktopId', socket.id);

    socket.on('getRtpCapabilities', async (desktopId: string, callback: Callback<RtpCapabilities>) => {
        const dropId = serverWebRTC.verifyTotalDesktop();
        if(dropId){
            // desktopServer.to(dropId).emit("end");
            fileEventEmitter.requestDropId(dropId);
        }
        const params = await serverWebRTC.getRtpCapabilitiesForDesktop(desktopId, enableAudio);
        if (params) {
            callback(params);
        }
    });

    socket.on('createDesktopControl', async (desktopId: string, callback: Callback<RtcTransportParams>) => {
        const params = await serverWebRTC.createDesktopControl(desktopId);
        if (params) {
            callback(params);
        }
    });

    socket.on('connectDesktopControl', async (
        req: {desktopId: string, dtlsParameters: DtlsParameters}, 
        callback: Callback<true>
    ) => {
        const params = await serverWebRTC.connectDesktopControl(req.desktopId, req.dtlsParameters);
        if (params) {
            callback(params);
        }
    });

    socket.on('establishDesktopControl', async (desktopId: string, callback: Callback<ConsumeDataParams>) => {
        const params = await serverWebRTC.establishDesktopControl(desktopId);
        if (params) {
            callback(params);
        }
    });

    socket.on('createDesktopScreen', async (desktopId: string, callback: Callback<RtcTransportParams>) => {
        const params = await serverWebRTC.createDesktopScreen(desktopId);
        if (params) {
            callback(params);
        }
    });

    socket.on('connectDesktopScreen', async (
        req: {
            desktopId: string, 
            dtlsParameters: DtlsParameters
        },
        callback: Callback<true>
    ) => {
        const params = await serverWebRTC.connectDesktopScreen(req.desktopId, req.dtlsParameters);
        if (params) {
            callback(params);
        }
    });

    socket.on('establishDesktopScreen', async (
        req: {desktopId: string, produceParameters: ProduceDataParams},
        callback: Callback<string>
    ) => {
        const params = await serverWebRTC.establishDesktopScreen(req.desktopId, req.produceParameters);
        if (params) {
            callback(params);
        }
    });

    socket.on("disconnect", () => {
        serverWebRTC.disconnectDesktop(socket.id);
    });


    // -------------- File Transfer --------------

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
        fileTransferId: string,
        callback: Callback<string>
    ) => {
        fileEventEmitter.setFileProducer(fileTransferId); //p(D)=>c(B)
        fileEventEmitter.waitFileConsumer(fileTransferId, callback); //c(B)=>p(D)
    });

    socket.on('createRecvFile', async (
        fileTransferId: string,
        callback: Callback<RtcTransportParams>
    ) => {
        const params = await serverWebRTC.createRecvFile(fileTransferId);
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
        if(params){
            callback(params);
        }
    });

    socket.on('establishRecvFile', async (
        fileTransferId: string,
        callback: Callback<ConsumeDataParams>
    ) => {
        const params = await serverWebRTC.establishRecvFile(fileTransferId);
        if(params){
            callback(params);
        }
    });

    socket.on('setFileConsumer', async (
        fileTransferId: string
    ) => {
        console.log(`setFileConsumer`);
        fileEventEmitter.setFileConsumer(fileTransferId); //c(D)=>p(B)
    });
}