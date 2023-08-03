import * as mediasoupClient from "mediasoup-client";
import { Socket } from 'socket.io-client';
import { RtcTransportParams } from "./type";
import { sendRequest } from "../util";

export const createDevice = async (
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Device> => {
    const rtpCap: mediasoupClient.types.RtpCapabilities
         = await sendRequest(socket, 'getRtpCapabilities', desktopId);

    //console.log(rtpCap);
    const device = new mediasoupClient.Device();
    await device.load({ routerRtpCapabilities: rtpCap });
    return device;
}

export const createSendTransport = async (
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Transport> => {
    const params: RtcTransportParams = await sendRequest(socket, 'createMediaControl', desktopId);

    const transport = device.createSendTransport(params);
    return transport;
}

export const sendEventEmitter = (
    transport: mediasoupClient.types.Transport,
    socket: Socket,
    desktopId: string
): void => {
    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        sendRequest(
            socket, 
            'connectMediaControl', 
            {
                desktopId: desktopId,
                dtlsParameters: dtlsParameters,
            }
        )
        .then(callback)
        .catch(errback);
    });

    transport.on('producedata', async (parameters, callback, errback) => {
        try {
            const id = await sendRequest(
                socket,
                'establishMediaControl', 
                {
                    desktopId: desktopId,
                    produceParameters: parameters,
                });
            callback({ id: id });
        } catch (err: any) {
            errback(err);
        }
    });

    transport.observer.on('close', () => {
        transport.close();
    });
}

export const getControlProducer = async (
    transport: mediasoupClient.types.Transport,
): Promise<mediasoupClient.types.DataProducer> => {
    const producer = await transport.produceData();
    return producer;
}

// --- Cousumer ---
//createMediaScreenOrAudio
export const createRecvTransport = async (
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string,
    isAudio: boolean
): Promise<mediasoupClient.types.Transport> => {
    const params: RtcTransportParams = await sendRequest(
        socket,
        'createMediaScreenOrAudio', 
        { desktopId: desktopId, isAudio: isAudio}
    );

    const transport = device.createRecvTransport(params);
    return transport;
}

export const recvScreenEventEmitter = (
    transport: mediasoupClient.types.Transport,
    socket: Socket,
    desktopId: string,
): void => {
    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        sendRequest(
            socket,
            'connectMediaScreenOrAudio', 
            {
                desktopId: desktopId,
                dtlsParameters: dtlsParameters,
                isAudio: false
            }
        )
        .then(callback)
        .catch(errback);
    });
    
    transport.observer.on('close', () => {
        transport.close();
    });
}

export const getScreenConsumer = async (
    transport: mediasoupClient.types.Transport,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.DataConsumer> => {
    const params = await sendRequest(socket, 'establishMediaScreen', desktopId);
    const consumer = await transport.consumeData(params);
    return consumer;
}

export const recvAudioEventEmitter = (
    transport: mediasoupClient.types.Transport,
    socket: Socket,
    desktopId: string
): void => {
    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        sendRequest(
            socket,
            'connectMediaScreenOrAudio', 
            {
            desktopId: desktopId,
            dtlsParameters: dtlsParameters,
            isAudio: true
            }
        ).
        then(callback)
        .catch(errback);
    });

    transport.observer.on('close', () => {
        transport.close();
    });
}

export const getAudioConsumer = async (
    device: mediasoupClient.types.Device,
    transport: mediasoupClient.types.Transport,
    socket: Socket,
    desktopId: string,
): Promise<mediasoupClient.types.Consumer> => {
    const params = await sendRequest(
        socket,
        'establishMediaAudio', {
        desktopId: desktopId,
        rtpCapabilities: device.rtpCapabilities
    });
    const consumer = await transport.consume(params);
    return consumer;
}