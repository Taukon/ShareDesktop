import { Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { ConsumeDataParams, ProduceDataParam, TransportParams } from '../mediasoup/type';
import { AudioData } from '../../../util/type';

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

// -------- DesktopScreen --------

export const createDesktopScreen = async (
    socket: Socket,
    desktopId: string
): Promise<TransportParams> => {
    return await sendRequest(socket, 'createDesktopScreen', desktopId);
}

export const connectDesktopScreen = async (
    socket: Socket,
    desktopId: string,
    dtlsParameters:mediasoupClient.types.DtlsParameters
): Promise<void> => {
 return await sendRequest(
                socket,
                'connectDesktopScreen', 
                { desktopId: desktopId, dtlsParameters: dtlsParameters }
            );
}

export const establishDesktopScreen = async (
    socket: Socket,
    desktopId: string,
    params: ProduceDataParam
): Promise<string> => {
    return await sendRequest(
        socket,
        'establishDesktopScreen', 
        { desktopId: desktopId, produceParameters: params }
    );
}

// -------- DesktopControl --------

export const createDesktopControl = async (
    socket: Socket,
    desktopId: string  
): Promise<TransportParams> => {
    return await sendRequest(socket, 'createDesktopControl', desktopId);
}

export const connectDesktopControl = async (
    socket: Socket,
    desktopId: string,
    dtlsParameters: mediasoupClient.types.DtlsParameters
): Promise<void> => {
    return await sendRequest(
        socket,
        'connectDesktopControl', 
        { 
            desktopId: desktopId, 
            dtlsParameters: dtlsParameters
        }
    );
}

export const establishDesktopControl = async (
    socket: Socket,
    desktopId: string
): Promise<ConsumeDataParams> => {
    return await sendRequest(socket, 'establishDesktopControl', desktopId);
}

export const establishDesktopAudio = async (
    socket: Socket,
    desktopId: string
): Promise<AudioData> => {
    return await sendRequest(socket, 'establishDesktopAudio', desktopId);
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
