import { Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import {  ProduceDataParam,} from './mediasoup/type';
import { 
    connectDesktopControl, 
    connectDesktopScreen, 
    connectRecvFile, 
    connectSendFile, 
    createDesktopControl, 
    createDesktopScreen, 
    createRecvFile, 
    createSendFile, 
    establishDesktopControl, 
    establishDesktopScreen, 
    establishRecvFile, 
    establishSendFile, 
    getRtpCapabilities 
} from './signaling';
import { 
    createRecvTransport,
    createSendTransport, 
    getConsumeData, 
    loadDevice, 
    recvEventEmitter, 
    sendEventEmitter
 } from './mediasoup';

export const createDevice = async (
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Device> => {
    const forDevice = async () => await getRtpCapabilities(socket, desktopId);
    const device = await loadDevice(forDevice);        
    return device;
}

// ----- Screen

export const createScreenTransport = async (
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Transport> => {
    const forTransport =  async () => await createDesktopScreen(socket, desktopId);
    const transport = await createSendTransport(device, forTransport);

    const forConnect = async (
                dtlsParameters: mediasoupClient.types.DtlsParameters
            ) => await connectDesktopScreen(socket, desktopId, dtlsParameters);
    const forProducedata = async (params: ProduceDataParam) => 
        await establishDesktopScreen(socket, desktopId, params);
    sendEventEmitter(transport, forConnect, forProducedata);
    
    return transport;
}

export const getScreenProducer =async (
    transport: mediasoupClient.types.Transport
): Promise<mediasoupClient.types.DataProducer> => {
    const producer = await transport.produceData({ordered: false, maxRetransmits: 0});
    return producer;
}

// ----- Control

export const createControlTransport = async (
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Transport> => {
    const forTransport = async () => await createDesktopControl(socket, desktopId);
    const transport = await createRecvTransport(device, forTransport);

    const forConnect = async (
            dtlsParameters: mediasoupClient.types.DtlsParameters
        ) => await connectDesktopControl(socket, desktopId, dtlsParameters);
    recvEventEmitter(transport, forConnect);

    return transport;
}

export const getControlConsumer = async (
    transport: mediasoupClient.types.Transport,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.DataConsumer> => {
    const forConsumeData = async () => await establishDesktopControl(socket, desktopId);
    const consumer = await getConsumeData(transport, forConsumeData);
    return consumer;
}

// ----- SendFile
export const createSendFileTransport = async (
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Transport> => {
    const forTransport =  async () => await createSendFile(socket, desktopId);
    const transport = await createSendTransport(device, forTransport);

    const forConnect = async (
            dtlsParameters:mediasoupClient.types.DtlsParameters
        ) => await connectSendFile(socket, desktopId, dtlsParameters); 
    const forProducedata = async (
            params: ProduceDataParam
        ) => await establishSendFile(socket, desktopId, params);
    sendEventEmitter(transport, forConnect, forProducedata);

    return transport;
}

export const getSendFileProducer =async (
    transport: mediasoupClient.types.Transport
): Promise<mediasoupClient.types.DataProducer> => {
    const producer = await transport.produceData({ordered: true});
    return producer;
}

// ----- RecvFile
export const createRecvFileTransport = async (
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Transport> => {
    const forTransport = async () => await createRecvFile(socket, desktopId);
    const transport = await createRecvTransport(device, forTransport);

    const forConnect = async (
            dtlsParameters: mediasoupClient.types.DtlsParameters
        ) => await connectRecvFile(socket, desktopId, dtlsParameters); 
    
    recvEventEmitter(transport, forConnect);

    return transport;
}


export const getRecvFileConsumer = async (
    transport: mediasoupClient.types.Transport,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.DataConsumer> => {
    const forConsumeData = async () => await establishRecvFile(socket, desktopId);
    const consumer = await getConsumeData(transport, forConsumeData);
    return consumer;
}