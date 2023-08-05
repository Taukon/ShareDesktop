import * as mediasoupClient from "mediasoup-client";
import { Socket } from 'socket.io-client';
import { ConsumeDataParams, ConsumeParams, ProduceDataParam, TransportParams } from "../mediasoup/type";

const sendRequest = async (
    socket: Socket,
    type: string, 
    data: any
): Promise<any> => {
    return new Promise((resolve) => {
        socket.emit(type, data, (res: any) => resolve(res));
    });
}

export const getRtpCapabilities = async (
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.RtpCapabilities> => {
    return await sendRequest(socket, 'getRtpCapabilities', desktopId);
}

// ------- Control

export const createMediaControl = async(
    socket: Socket,
    desktopId: string
): Promise<TransportParams> => {
    return await sendRequest(socket, 'createMediaControl', desktopId);
}

export const connectMediaControl = async (
    socket: Socket,
    desktopId: string,
    dtlsParameters: mediasoupClient.types.DtlsParameters
): Promise<void> => {
    return await sendRequest(
        socket, 
        'connectMediaControl', 
        {
            desktopId: desktopId,
            dtlsParameters: dtlsParameters,
        }
    );
}

export const establishMediaControl = async (
    socket: Socket,
    desktopId: string,
    params: ProduceDataParam
): Promise<string> => {
    return await sendRequest(
        socket,
        'establishMediaControl', 
        {desktopId: desktopId, produceParameters: params}
    );
}

// ------ Screen

export const createMediaScreen = async(
    socket: Socket,
    desktopId: string
): Promise<TransportParams> => {
    return await sendRequest(
        socket,
        'createMediaScreenOrAudio', 
        { desktopId: desktopId, isAudio: false}
    );
}

export const connectMediaScreen = async (
    socket: Socket,
    desktopId: string,
    dtlsParameters: mediasoupClient.types.DtlsParameters
): Promise<void> => {
    return await sendRequest(
        socket,
        'connectMediaScreenOrAudio', 
        {
        desktopId: desktopId,
        dtlsParameters: dtlsParameters,
        isAudio: false
        }
    )
}

export const establishMediaScreen = async (
    socket: Socket,
    desktopId: string
): Promise<ConsumeDataParams> => {
    return await sendRequest(socket, 'establishMediaScreen', desktopId);
}


// ------- Audio

export const createMediaAudio = async(
    socket: Socket,
    desktopId: string
): Promise<TransportParams> => {
    return await sendRequest(
        socket,
        'createMediaScreenOrAudio', 
        { desktopId: desktopId, isAudio: true}
    );
}

export const connectMediaAudio = async (
    socket: Socket,
    desktopId: string,
    dtlsParameters: mediasoupClient.types.DtlsParameters
): Promise<void> => {
    return await sendRequest(
        socket,
        'connectMediaScreenOrAudio', 
        {
        desktopId: desktopId,
        dtlsParameters: dtlsParameters,
        isAudio: true
        }
    )
}

export const establishMediaAudio = async (
    socket: Socket,
    desktopId: string,
    rtpCapabilities: mediasoupClient.types.RtpCapabilities
): Promise<ConsumeParams> => {
    return await  sendRequest(
        socket,
        'establishMediaAudio', {
        desktopId: desktopId,
        rtpCapabilities: rtpCapabilities
    });
}

// -------- SendFile --------

export const createSendFile = async (
    socket: Socket,
    desktopId: string
): Promise<TransportParams> => {
    return await sendRequest(socket, 'createSendFile', desktopId);
}

export const connectSendFile = async (
    socket: Socket,
    desktopId: string,
    dtlsParameters:mediasoupClient.types.DtlsParameters
): Promise<void> => {
    return await sendRequest(
        socket,
        'connectSendFile',
        { desktopId: desktopId, dtlsParameters: dtlsParameters }
    );
}

export const establishSendFile = async (
    socket: Socket,
    desktopId: string,
    params: ProduceDataParam
): Promise<string> => {
    return await sendRequest(
        socket,
        'establishSendFile', 
        { desktopId: desktopId, produceParameters: params }
    );
}

// -------- RecvFile --------

export const createRecvFile = async (
    socket: Socket,
    desktopId: string
): Promise<TransportParams> => {
    return await sendRequest(socket, 'createRecvFile', {desktopId: desktopId});
}

export const connectRecvFile = async (
    socket: Socket,
    desktopId: string,
    dtlsParameters: mediasoupClient.types.DtlsParameters
): Promise<void> => {
    return await sendRequest(
        socket,
        'connectRecvFile', 
        {
            desktopId: desktopId,
            dtlsParameters: dtlsParameters
        }
    );
}

export const establishRecvFile = async (
    socket: Socket,
    desktopId: string
): Promise<ConsumeDataParams> => {
    return await sendRequest(socket, 'establishRecvFile', desktopId);
}