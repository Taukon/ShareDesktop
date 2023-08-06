import { Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { 
    ConsumeDataParams, 
    ProduceDataParam, 
    TransportParams 
} from '../mediasoup/type';
import { AudioData } from '../../../util/type';
import { Signaling } from './type';

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

// -------- DesktopScreen --------

export const createDesktopScreen = (
    socket: Socket,
    desktopId: string
): Signaling<void, TransportParams> => {
    return () => sendRequest(socket, 'createDesktopScreen', desktopId);
}

export const connectDesktopScreen = (
    socket: Socket,
    desktopId: string
): Signaling<mediasoupClient.types.DtlsParameters, void> => {
 return (dtlsParameters: mediasoupClient.types.DtlsParameters) => sendRequest(
                socket,
                'connectDesktopScreen', 
                { desktopId: desktopId, dtlsParameters: dtlsParameters }
            );
}

export const establishDesktopScreen = (
    socket: Socket,
    desktopId: string
): Signaling<ProduceDataParam, string> => {
    return (params: ProduceDataParam) => sendRequest(
        socket,
        'establishDesktopScreen', 
        { desktopId: desktopId, produceParameters: params }
    );
}

// -------- DesktopControl --------

export const createDesktopControl = (
    socket: Socket,
    desktopId: string  
): Signaling<void, TransportParams> => {
    return () => sendRequest(socket, 'createDesktopControl', desktopId);
}

export const connectDesktopControl = (
    socket: Socket,
    desktopId: string
): Signaling<mediasoupClient.types.DtlsParameters, void> => {
    return (dtlsParameters: mediasoupClient.types.DtlsParameters) => sendRequest(
        socket,
        'connectDesktopControl', 
        { 
            desktopId: desktopId, 
            dtlsParameters: dtlsParameters
        }
    );
}

export const establishDesktopControl = (
    socket: Socket,
    desktopId: string
): Signaling<void, ConsumeDataParams> => {
    return () => sendRequest(socket, 'establishDesktopControl', desktopId);
}

export const establishDesktopAudio = async (
    socket: Socket,
    desktopId: string
): Promise<AudioData> => {
    return await sendRequest(socket, 'establishDesktopAudio', desktopId);
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
