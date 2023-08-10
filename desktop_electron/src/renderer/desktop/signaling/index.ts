import { Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { 
    ConsumeDataParams, 
    ProduceDataParam, 
    TransportParams 
} from '../mediasoup/type';
import { AudioData } from '../../../util/type';
import { FileInfo, Signaling } from './type';

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

// -------- DesktopAUdio ---------

export const establishDesktopAudio = async (
    socket: Socket,
    desktopId: string
): Promise<AudioData> => {
    return await sendRequest(socket, 'establishDesktopAudio', desktopId);
}


// -------- DesktopFileWatch --------

export const createDesktopFileWatch = (
    socket: Socket,
    desktopId: string
): Signaling<void, TransportParams> => {
    return () => sendRequest(socket, 'createFileWatch', desktopId);
}

export const connectDesktopFileWatch = (
    socket: Socket,
    desktopId: string
): Signaling<mediasoupClient.types.DtlsParameters, void> => {
 return (dtlsParameters: mediasoupClient.types.DtlsParameters) => sendRequest(
                socket,
                'connectFileWatch', 
                { desktopId: desktopId, dtlsParameters: dtlsParameters }
            );
}

export const establishDesktopFileWatch = (
    socket: Socket,
    desktopId: string
): Signaling<ProduceDataParam, string> => {
    return (params: ProduceDataParam) => sendRequest(
        socket,
        'establishFileWatch', 
        { desktopId: desktopId, produceParameters: params }
    );
}
// -------- SendFile --------

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
    fileInfo: FileInfo
): Signaling<void, string> => {
    return () => sendRequest(
        socket,
        'waitFileConsumer', 
        fileInfo
    );
}

// -------- RecvFile --------

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
