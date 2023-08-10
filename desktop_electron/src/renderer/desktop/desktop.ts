import { Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { 
    connectDesktopControl, 
    connectDesktopFileWatch, 
    connectDesktopScreen, 
    connectRecvFile, 
    connectSendFile, 
    createDesktopControl, 
    createDesktopFileWatch, 
    createDesktopScreen, 
    createRecvFile, 
    createSendFile, 
    establishDesktopControl, 
    establishDesktopFileWatch, 
    establishDesktopScreen, 
    establishRecvFile, 
    establishSendFile, 
    getRtpCapabilities,
    waitSetFileConsumer, 
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

// ----- FileWatch
export const createFileWatchTransport = async (
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Transport> => {
    const forTransport =  createDesktopFileWatch(socket, desktopId);
    const transport = await createSendTransport(device, forTransport);

    const forConnect = connectDesktopFileWatch(socket, desktopId);
    const forProducedata = establishDesktopFileWatch(socket, desktopId);
    sendEventEmitter(transport, forConnect, forProducedata);
    
    return transport;
}

export const getFileWatchProducer =async (
    transport: mediasoupClient.types.Transport
): Promise<mediasoupClient.types.DataProducer> => {
    const producer = await transport.produceData({ordered: true});
    return producer;
}

// ----- SendFile
export const createSendFileTransport = async (
    device: mediasoupClient.types.Device,
    socket: Socket,
    fileTransferId: string
): Promise<mediasoupClient.types.Transport> => {
    const forTransport =  createSendFile(socket, fileTransferId);
    const transport = await createSendTransport(device, forTransport);

    const forConnect = connectSendFile(socket, fileTransferId); 
    const forProducedata = establishSendFile(socket, fileTransferId);
    sendEventEmitter(transport, forConnect, forProducedata);

    return transport;
}

export const getSendFileProducer = async (
    transport: mediasoupClient.types.Transport
): Promise<mediasoupClient.types.DataProducer> => {
    const producer = await transport.produceData({ordered: true});
    return producer;
}

export const WaitFileConsumer = async (
    socket: Socket,
    fileTransferId: string,
    fileName: string,
    fileSize: number
): Promise<string> => {
    const onReady = waitSetFileConsumer(socket, fileTransferId, fileName, fileSize);
    return await onReady();
}

// ----- RecvFile
export const createRecvFileTransport = async (
    device: mediasoupClient.types.Device,
    socket: Socket,
    fileTransferId: string
): Promise<mediasoupClient.types.Transport> => {
    const forTransport = createRecvFile(socket, fileTransferId);
    const transport = await createRecvTransport(device, forTransport);

    const forConnect = connectRecvFile(socket, fileTransferId); 
    recvEventEmitter(transport, forConnect);

    return transport;
}

export const getRecvFileConsumer = async (
    transport: mediasoupClient.types.Transport,
    socket: Socket,
    fileTransferId: string
): Promise<mediasoupClient.types.DataConsumer> => {
    const forConsumeData = establishRecvFile(socket, fileTransferId);
    const consumer = await getConsumeData(transport, forConsumeData);
    return consumer;
}