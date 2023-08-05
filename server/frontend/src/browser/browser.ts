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
    connectMediaAudio,
    connectMediaControl,
    connectMediaScreen,
    createMediaControl, 
    createMediaScreen, 
    establishMediaAudio, 
    establishMediaControl,
    establishMediaScreen,
    getRtpCapabilities
} from "./signaling";
import { ProduceDataParam } from "./mediasoup/type";

export const createDevice = async (
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Device> => {
    const forDevice = async () => await getRtpCapabilities(socket, desktopId);
    const device = await loadDevice(forDevice);        
    return device;
}

// -------- Control

export const createControlTransport = async (
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Transport> => {
    const forTransport = async () => await createMediaControl(socket, desktopId);
    const transport = await createSendTransport(device, forTransport);
    
    const forConnect = async(
        dtlsParameters: mediasoupClient.types.DtlsParameters
    ) => await connectMediaControl(socket, desktopId, dtlsParameters);
    const forProduceData = async (
        params: ProduceDataParam
    ) => await establishMediaControl(socket, desktopId, params); 
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
    const forTransport = async () => await createMediaScreen(socket, desktopId);
    const transport = await createRecvTransport(device, forTransport);

    const forConnect = async(
        dtlsParameters: mediasoupClient.types.DtlsParameters
    ) => await connectMediaScreen(socket, desktopId, dtlsParameters);
    recvEventEmitter(transport, forConnect); 

    return transport;
};

export const getScreenConsumer = async (
    transport: mediasoupClient.types.Transport,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.DataConsumer> => {
    const forConsumeData = async () => await establishMediaScreen(socket, desktopId);
    const consumer = await getConsumeData(transport, forConsumeData);
    return consumer;
};

// ------- Audio

export const createAudioTransport = async(
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Transport> => {
    const forTransport = async () => await createMediaControl(socket, desktopId);
    const transport = await createRecvTransport(device, forTransport);

    const forConnect = async(
        dtlsParameters: mediasoupClient.types.DtlsParameters
    ) => await connectMediaAudio(socket, desktopId, dtlsParameters);
    recvEventEmitter(transport, forConnect);

    return transport;
};

export const getAudioConsumer = async (
    rtpCapabilities: mediasoupClient.types.RtpCapabilities,
    transport: mediasoupClient.types.Transport,
    socket: Socket,
    desktopId: string,
): Promise<mediasoupClient.types.Consumer> => {
    const forConsume = async () => 
        await establishMediaAudio(socket, desktopId, rtpCapabilities);
    const consumer = await getConsume(transport, forConsume);

    return consumer;
}
