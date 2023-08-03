import { io, Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { Chrome111 } from 'mediasoup-client/lib/handlers/Chrome111.js';
import { sendRequest } from '../util';

export const createDevice = async (
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Device> => {
    const rtpCap: mediasoupClient.types.RtpCapabilities
         = await sendRequest(socket, 'getRtpCapabilities', desktopId);
    //console.log(rtpCap);
    const device = new mediasoupClient.Device({handlerFactory: Chrome111.createFactory()});
    await device.load({ routerRtpCapabilities: rtpCap });
    return device;
}

export const createScreenTransport = async (
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Transport> => {
    const params = await sendRequest(socket, 'createDesktopScreen', desktopId);
    const transport = device.createSendTransport(params);
    
    sendScreenEventEmitter(transport, socket, desktopId);

    return transport;
}

const sendScreenEventEmitter = (
    transport: mediasoupClient.types.Transport,
    socket: Socket,
    desktopId: string
): void => {
    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        sendRequest(
            socket,
            'connectDesktopScreen', 
            { desktopId: desktopId, dtlsParameters: dtlsParameters }
        )
        .then(callback)
        .catch(errback);
    });

    transport.on('producedata', async (parameters, callback, errback) => {
        try {
            const id = await sendRequest(
                socket,
                'establishDesktopScreen', 
                { desktopId: desktopId, produceParameters: parameters }
            );
            callback({ id: id });
        } catch (err: any) {
            errback(err);
        }
    });

    transport.observer.on('close', () => {
        transport.close();
    });
}

export const getScreenProducer =async (
    transport: mediasoupClient.types.Transport
): Promise<mediasoupClient.types.DataProducer> => {
    const producer = await transport.produceData({ordered: false, maxRetransmits: 0});
    return producer;
}


export const createControlTransport = async (
    device: mediasoupClient.types.Device,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.Transport> => {
    const params = await sendRequest(socket, 'createDesktopControl', desktopId);
    const transport = device.createRecvTransport(params);
    
    controlEventEmitter(transport, socket, desktopId);

    return transport;
}

const controlEventEmitter = (
    transport: mediasoupClient.types.Transport,
    socket: Socket,
    desktopId: string
): void => {
    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        sendRequest(
            socket,
            'connectDesktopControl', 
            { desktopId: desktopId, dtlsParameters: dtlsParameters}
        )
        .then(callback)
        .catch(errback);
    });

    transport.observer.on('close', () => {
        transport.close();
    });
}

export const getControlConsumer = async (
    transport: mediasoupClient.types.Transport,
    socket: Socket,
    desktopId: string
): Promise<mediasoupClient.types.DataConsumer> => {
    const params = await sendRequest(socket, 'establishDesktopControl', desktopId);
    const consumer = await transport.consumeData(params);
    return consumer;
}

