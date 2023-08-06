import * as mediasoupClient from "mediasoup-client";
import { Socket } from 'socket.io-client';
import { 
    ConsumeDataParams, 
    ConsumeParams, 
    ProduceDataParam, 
    TransportParams 
} from "../mediasoup/type";
import { Signaling } from "./type";

const sendRequest = async (
    socket: Socket,
    type: string, 
    data: any
): Promise<any> => {
    return new Promise((resolve) => {
        socket.emit(type, data, (res: any) => resolve(res));
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

// -------- SendFile --------


export const createSendFile = (
    socket: Socket,
    desktopId: string
): Signaling<void, TransportParams> => {
    return () => sendRequest(socket, 'createSendFile', desktopId);
}

export const connectSendFile =(
    socket: Socket,
    desktopId: string
): Signaling<mediasoupClient.types.DtlsParameters, void> => {
    return (dtlsParameters:mediasoupClient.types.DtlsParameters) => sendRequest(
        socket,
        'connectSendFile',
        { desktopId: desktopId, dtlsParameters: dtlsParameters }
    );
}

export const establishSendFile = (
    socket: Socket,
    desktopId: string
): Signaling<ProduceDataParam, string> => {
    return (params: ProduceDataParam) => sendRequest(
        socket,
        'establishSendFile', 
        { desktopId: desktopId, produceParameters: params }
    );
}

// -------- RecvFile --------

export const createRecvFile = (
    socket: Socket,
    desktopId: string
): Signaling<void, TransportParams> => {
    return () => sendRequest(socket, 'createRecvFile', {desktopId: desktopId});
}

export const connectRecvFile = (
    socket: Socket,
    desktopId: string
):  Signaling<mediasoupClient.types.DtlsParameters, void> => {
    return (dtlsParameters: mediasoupClient.types.DtlsParameters) => sendRequest(
        socket,
        'connectRecvFile', 
        {
            desktopId: desktopId,
            dtlsParameters: dtlsParameters
        }
    );
}

export const establishRecvFile = (
    socket: Socket,
    desktopId: string
): Signaling<void, ConsumeDataParams> => {
    return () => sendRequest(socket, 'establishRecvFile', desktopId);
}