import * as mediasoupClient from "mediasoup-client";
import { Socket } from 'socket.io-client';
import { 
    createRecvTransport,
    createSendTransport, 
    getConsume, 
    getConsumeData, 
    loadDevice, 
    recvEventEmitter, 
    sendEventEmitter
} from "./mediasoup";
import { 
    connectBrowserFileWatch,
    connectMediaAudio,
    connectMediaControl,
    connectMediaScreen,
    connectRecvFile,
    connectSendFile,
    createBrowserFileWatch,
    createMediaAudio,
    createMediaControl, 
    createMediaScreen, 
    createRecvFile, 
    createSendFile, 
    establishBrowserFileWatch, 
    establishMediaAudio, 
    establishMediaControl,
    establishMediaScreen,
    establishRecvFile,
    establishSendFile,
    getRtpCapabilities,
    waitSetFileConsumer
} from "./signaling";

export const createDevice = async (
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Device> => {
    const forDevice = getRtpCapabilities(socket, desktopId);
    const device = await loadDevice(forDevice);        
    return device;
}

// -------- Control

export const createControlTransport = async (
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Transport> => {
    const forTransport = createMediaControl(socket, desktopId);
    const transport = await createSendTransport(device, forTransport);
    
    const forConnect = connectMediaControl(socket, desktopId);
    const forProduceData = establishMediaControl(socket, desktopId); 
    sendEventEmitter(transport, forConnect, forProduceData);
    
    return transport;
};

export const getControlProducer = async (
    transport: mediasoupClient.types.Transport,
): Promise<mediasoupClient.types.DataProducer> => {
    const producer = await transport.produceData();
    return producer;
};

// ------- Screen

export const createScreenTransport = async(
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Transport> => {
    const forTransport = createMediaScreen(socket, desktopId);
    const transport = await createRecvTransport(device, forTransport);

    const forConnect = connectMediaScreen(socket, desktopId);
    recvEventEmitter(transport, forConnect); 

    return transport;
};

export const getScreenConsumer = async (
    transport: mediasoupClient.types.Transport,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.DataConsumer> => {
    const forConsumeData = establishMediaScreen(socket, desktopId);
    const consumer = await getConsumeData(transport, forConsumeData);
    return consumer;
};

// ------- Audio

export const createAudioTransport = async(
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Transport> => {
    const forTransport = createMediaAudio(socket, desktopId);
    const transport = await createRecvTransport(device, forTransport);

    const forConnect = connectMediaAudio(socket, desktopId);
    recvEventEmitter(transport, forConnect);

    return transport;
};

export const getAudioConsumer = async (
    rtpCapabilities: mediasoupClient.types.RtpCapabilities,
    transport: mediasoupClient.types.Transport,
    socket: Socket,
    desktopId: string,
): Promise<mediasoupClient.types.Consumer> => {
    const forConsume = establishMediaAudio(socket, desktopId, rtpCapabilities);
    const consumer = await getConsume(transport, forConsume);

    return consumer;
}

// ------- FileWatch
export const createFileWatchTransport = async(
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Transport> => {
    const forTransport = createBrowserFileWatch(socket, desktopId);
    const transport = await createRecvTransport(device, forTransport);

    const forConnect = connectBrowserFileWatch(socket, desktopId);
    recvEventEmitter(transport, forConnect); 

    return transport;
};

export const getFileWatchConsumer = async (
    transport: mediasoupClient.types.Transport,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.DataConsumer> => {
    const forConsumeData = establishBrowserFileWatch(socket, desktopId);
    const consumer = await getConsumeData(transport, forConsumeData);
    return consumer;
};

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

export const getSendFileProducer =async (
    transport: mediasoupClient.types.Transport
): Promise<mediasoupClient.types.DataProducer> => {
    const producer = await transport.produceData({ordered: true});
    return producer;
}

export const WaitFileConsumer = async (
    socket: Socket,
    fileTransferId: string
): Promise<string> => {
    const onReady = waitSetFileConsumer(socket, fileTransferId);
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