import * as mediasoupClient from "mediasoup-client";
import { Socket } from 'socket.io-client';
import { 
    ConsumeDataParams, 
    ConsumeParams, 
    ProduceDataParam, 
    TransportParams 
} from "../mediasoup/type";
import { Signaling } from "./type";

const sendRequest = async <T>(
    socket: Socket,
    type: string, 
    data: any
): Promise<T> => {
    return new Promise((resolve) => {
        socket.emit(type, data, (res: T) => resolve(res));
    });
}

export const getRtpCapabilities = (
    socket: Socket,
    desktopId: string
): Signaling<void, mediasoupClient.types.RtpCapabilities> => {
    return () => sendRequest(socket, 'getRtpCapabilities', desktopId);
}

// ------- Control

export const createMediaControl = (
    socket: Socket,
    desktopId: string
): Signaling<void, TransportParams> => {
    return () => sendRequest(socket, 'createMediaControl', desktopId);
}

export const connectMediaControl = (
    socket: Socket,
    desktopId: string
): Signaling<mediasoupClient.types.DtlsParameters, void> => {
    return (dtlsParameters: mediasoupClient.types.DtlsParameters) => sendRequest(
        socket, 
        'connectMediaControl', 
        {
            desktopId: desktopId,
            dtlsParameters: dtlsParameters,
        }
    );
}

export const establishMediaControl = (
    socket: Socket,
    desktopId: string
): Signaling<ProduceDataParam, string> => {
    return (params: ProduceDataParam) => sendRequest(
        socket,
        'establishMediaControl', 
        {desktopId: desktopId, produceParameters: params}
    );
}

// ------ Screen

export const createMediaScreen = (
    socket: Socket,
    desktopId: string
): Signaling<void, TransportParams> => {
    return () => sendRequest(
        socket,
        'createMediaScreenOrAudio', 
        { desktopId: desktopId, isAudio: false}
    );
}

export const connectMediaScreen = (
    socket: Socket,
    desktopId: string
): Signaling<mediasoupClient.types.DtlsParameters, void> => {
    return ( dtlsParameters: mediasoupClient.types.DtlsParameters) => sendRequest(
        socket,
        'connectMediaScreenOrAudio', 
        {
        desktopId: desktopId,
        dtlsParameters: dtlsParameters,
        isAudio: false
        }
    )
}

export const establishMediaScreen = (
    socket: Socket,
    desktopId: string
): Signaling<void, ConsumeDataParams> => {
    return () => sendRequest(socket, 'establishMediaScreen', desktopId);
}


// ------- Audio

export const createMediaAudio = (
    socket: Socket,
    desktopId: string
): Signaling<void, TransportParams> => {
    return () => sendRequest(
        socket,
        'createMediaScreenOrAudio', 
        { desktopId: desktopId, isAudio: true}
    );
}

export const connectMediaAudio = (
    socket: Socket,
    desktopId: string
): Signaling<mediasoupClient.types.DtlsParameters, void> => {
    return (dtlsParameters: mediasoupClient.types.DtlsParameters) => sendRequest(
        socket,
        'connectMediaScreenOrAudio', 
        {
        desktopId: desktopId,
        dtlsParameters: dtlsParameters,
        isAudio: true
        }
    )
}

export const establishMediaAudio = (
    socket: Socket,
    desktopId: string,
    rtpCapabilities: mediasoupClient.types.RtpCapabilities
): Signaling<void, ConsumeParams> => {
    return () => sendRequest(
        socket,
        'establishMediaAudio', {
        desktopId: desktopId,
        rtpCapabilities: rtpCapabilities
    });
}

// ------ FileWatch

export const createBrowserFileWatch = (
    socket: Socket,
    desktopId: string
): Signaling<void, TransportParams> => {
    return () => sendRequest(
        socket,
        'createFileWatch', 
        desktopId
    );
}

export const connectBrowserFileWatch = (
    socket: Socket,
    desktopId: string
): Signaling<mediasoupClient.types.DtlsParameters, void> => {
    return ( dtlsParameters: mediasoupClient.types.DtlsParameters) => sendRequest(
        socket,
        'connectFileWatch', 
        {
        desktopId: desktopId,
        dtlsParameters: dtlsParameters
        }
    )
}

export const establishBrowserFileWatch = (
    socket: Socket,
    desktopId: string
): Signaling<void, ConsumeDataParams> => {
    return () => sendRequest(socket, 'establishFileWatch', desktopId);
}


// -------- SendFile --------

export const initSendFileTransfer = (
    socket: Socket,
    desktopId: string
): Signaling<void, string> => {
    return () => sendRequest(socket, 'initSendFileTransfer', desktopId);
}

export const createSendFile = (
    socket: Socket,
    fileTransferId: string
): Signaling<void, TransportParams> => {
    return () => sendRequest(socket, 'createSendFile', fileTransferId);
}

export const connectSendFile =(
    socket: Socket,
    fileTransferId: string
): Signaling<mediasoupClient.types.DtlsParameters, void> => {
    return (dtlsParameters:mediasoupClient.types.DtlsParameters) => sendRequest(
        socket,
        'connectSendFile',
        {fileTransferId: fileTransferId, dtlsParameters: dtlsParameters}
    );
}

export const establishSendFile = (
    socket: Socket,
    fileTransferId: string
): Signaling<ProduceDataParam, string> => {
    return (params: ProduceDataParam) => sendRequest(
        socket,
        'establishSendFile', 
        {fileTransferId: fileTransferId, produceParameters: params}
    );
}

export const waitSetFileConsumer = (
    socket: Socket,
    fileTransferId: string,
    fileName: string,
    fileSize: number
): Signaling<void, string> => {
    return () => sendRequest(
        socket,
        'waitFileConsumer', 
        {
            fileTransferId: fileTransferId, 
            fileName: fileName,
            fileSize: fileSize
        }
    );
}

// -------- RecvFile --------

export const initRecvFileTransfer = (
    socket: Socket,
    desktopId: string
): Signaling<void, {fileTransferId: string, fileName: string, fileSize: number}> => {
    return () => sendRequest(socket, 'initRecvFileTransfer', desktopId);
}

export const createRecvFile = (
    socket: Socket,
    fileTransferId: string
): Signaling<void, TransportParams> => {
    return () => sendRequest(socket, 'createRecvFile', fileTransferId);
}

export const connectRecvFile = (
    socket: Socket,
    fileTransferId: string
):  Signaling<mediasoupClient.types.DtlsParameters, void> => {
    return (dtlsParameters: mediasoupClient.types.DtlsParameters) => sendRequest(
        socket,
        'connectRecvFile', 
        {fileTransferId: fileTransferId, dtlsParameters: dtlsParameters}
    );
}

export const establishRecvFile = (
    socket: Socket,
    fileTransferId: string
): Signaling<void, ConsumeDataParams> => {
    return () => sendRequest(socket, 'establishRecvFile', fileTransferId);
}

export const setFileConsumer = (
    socket: Socket,
    fileTransferId: string
):Socket => {
    return socket.emit('setFileConsumer', fileTransferId);
}