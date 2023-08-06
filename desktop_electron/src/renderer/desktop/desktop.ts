import { Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
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
    getRtpCapabilities, 
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
    const forDevice = getRtpCapabilities(socket, desktopId);
    const device = await loadDevice(forDevice);        
    return device;
}

// ----- Screen

export const createScreenTransport = async (
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Transport> => {
    const forTransport =  createDesktopScreen(socket, desktopId);
    const transport = await createSendTransport(device, forTransport);

    const forConnect = connectDesktopScreen(socket, desktopId);
    const forProducedata = establishDesktopScreen(socket, desktopId);
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
    const forTransport = createDesktopControl(socket, desktopId);
    const transport = await createRecvTransport(device, forTransport);

    const forConnect = connectDesktopControl(socket, desktopId);
    recvEventEmitter(transport, forConnect);

    return transport;
}

export const getControlConsumer = async (
    transport: mediasoupClient.types.Transport,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.DataConsumer> => {
    const forConsumeData = establishDesktopControl(socket, desktopId);
    const consumer = await getConsumeData(transport, forConsumeData);
    return consumer;
}

// ----- SendFile
export const createSendFileTransport = async (
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Transport> => {
    const forTransport =  createSendFile(socket, desktopId);
    const transport = await createSendTransport(device, forTransport);

    const forConnect = connectSendFile(socket, desktopId); 
    const forProducedata = establishSendFile(socket, desktopId);
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
    const forTransport = createRecvFile(socket, desktopId);
    const transport = await createRecvTransport(device, forTransport);

    const forConnect = connectRecvFile(socket, desktopId); 
    recvEventEmitter(transport, forConnect);

    return transport;
}

export const getRecvFileConsumer = async (
    transport: mediasoupClient.types.Transport,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.DataConsumer> => {
    const forConsumeData = establishRecvFile(socket, desktopId);
    const consumer = await getConsumeData(transport, forConsumeData);
    return consumer;
}