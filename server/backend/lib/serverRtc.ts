import { createWorker } from 'mediasoup';
import {
    DtlsParameters,
    Router,
    RtpCapabilities,
    RtpCodecCapability,
    WebRtcTransportOptions,
    WorkerSettings,
} from 'mediasoup/node/lib/types';
import * as mediasoupClientType from "mediasoup-client/lib/types";
import { Server } from 'socket.io';
import { ServerChannel } from '@geckos.io/server';
import {
    AudioSendTransport,
    ClientTransports,
    consumeAudioResponse,
    consumeScreenResponse,
    ControlRecvTransport,
    CreateMediaWebRtcTransportResponse,
    createTransportResponse,
    DesktopList,
    MediaClient,
    MediaClientList,
    ScreenSendTransport,
    StartWorkerResponse,
} from './type';


/**
 * Worker
 * |-> Router
 *     |-> WebRtcTransport(s) for Producer
 *         |-> Producer
 *     |-> WebRtcTransport(s) for Consumer
 *         |-> Consumer
 *     |-> DirectTransport for Producer
 *         |-> Producer
 *     |-> DirectTransport(s) for Consumer
 *         |-> Consumer
 **/


export class serverRtc {

    private ip_addr: string;
    private router!: Router;
    private transportOption: WebRtcTransportOptions;
    private workerSettings: WorkerSettings;
    private mediaCodecs: RtpCodecCapability[];
    private socketIdList: string[] = [];
    private mediaClientList: MediaClientList = {}
    private desktopList: DesktopList = {};
    private limitClient: number;

    constructor(
        limitClient: number,
        transportOption: WebRtcTransportOptions, 
        workerSettings: WorkerSettings, 
        mediaCodecs: RtpCodecCapability[],
        ip_addr: string
    ){
        this.limitClient = limitClient;
        this.ip_addr = ip_addr;

        
        this.transportOption = transportOption;
        this.workerSettings = workerSettings;
        this.mediaCodecs = mediaCodecs;
        
        this.startWorker().then((v) => {
            this.router = v.router;
        });
    }


    private saveSocketId(sockId: string) {
        if(this.socketIdList.find(v => v == sockId) == undefined){
            this.mediaClientList[sockId] = {exits: true} as MediaClient;
            this.socketIdList.push(sockId);
        }
    }

    private isMediaClient(mediaClient: MediaClient|undefined): mediaClient is MediaClient { 
        return typeof mediaClient === 'object' && mediaClient.exits;
    }

    private isClientTransports(clientTransports: ClientTransports|undefined): clientTransports is ClientTransports {
        return typeof clientTransports === 'object' && clientTransports.exits;
    }

    private getClientTransports(sockId: string, desktopId:string): ClientTransports|undefined {

        const mediaClient= this.mediaClientList[sockId];
        if(this.isMediaClient(mediaClient)){
            const transports = mediaClient[desktopId];

            return this.isClientTransports(transports)? transports : undefined;
        }

        return undefined;
    }

    private setClientTransports(sockId: string, desktopId:string, clientTransports: ClientTransports): boolean {
        const mediaClient= this.mediaClientList[sockId];
        if(this.isMediaClient(mediaClient)){
            mediaClient[desktopId] = clientTransports;
            this.mediaClientList[sockId] = mediaClient;
            return true;
        }
        return false;
    }

    public async createDesktopTransports(desktopId: string, serverChannel: ServerChannel, enableAudio: boolean, rtcpMux?: boolean): Promise<boolean> {

        console.log(`geckos createDesktopTransports`);
        if(this.desktopList[desktopId]) {
            // FIXME: change desktop server transports
            console.log("already created desktop server transports");
            
            return false;
        }

        const screenTransport = await this.createDirectProducer();

        if(enableAudio){
            const audioTransport = await this.createPlainProducer(rtcpMux ?? false);

            // initialize desktop server
            this.desktopList[desktopId] = {
                channel: serverChannel,
                screenTransport: screenTransport,
                audioTransport: audioTransport
            };
        } else {
            // initialize desktop server
            this.desktopList[desktopId] = {
                channel: serverChannel,
                screenTransport: screenTransport
            };
            //console.log(this.desktopList[desktopId])
        }

        console.log(`desktop server: ${desktopId}`);

        return true;
    }

    public establishDesktopScreenAudio(
        desktopId: string,  
        enableAudio: boolean
    ): void {
        const serverChannel = this.desktopList[desktopId]?.channel;

        // connect screen between transport and serverChannel
        const screenSendDataProducer = this.desktopList[desktopId]?.screenTransport.producer;
    
        if(screenSendDataProducer && serverChannel){
            serverChannel.onRaw(image => {
                const bufData = Buffer.from(image as ArrayBuffer);
                screenSendDataProducer.send(bufData);
            });
        }

        // connect audio between transport and serverChannel
        if(enableAudio && serverChannel){
            const audioSendTransport = this.desktopList[desktopId]?.audioTransport;
            if(audioSendTransport){
                const localIp = audioSendTransport.tuple.localIp;

                // Read the transport local RTP port.
                const audioRtpPort = audioSendTransport.tuple.localPort;
                // If rtcpMux is false, read the transport local RTCP port.
                const audioRtcpPort = audioSendTransport.rtcpTuple?.localPort;
                // If enableSrtp is true, read the transport srtpParameters.
                const srtpParameters = audioSendTransport.srtpParameters;

                const msg = { 
                    rtp: audioRtpPort, 
                    rtcp: audioRtcpPort, 
                    ip_addr: localIp, 
                    srtpParameters: srtpParameters 
                };
                serverChannel.emit(
                    'audio', 
                    JSON.stringify(msg),
                    {
                        // Set the reliable option
                        // Default: false
                        reliable: true,
                        // The interval between each message in ms (optional)
                        // Default: 150
                        interval: 150,
                        // How many times the message should be sent (optional)
                        // Default: 10
                        runs: 10
                    }
                );
            }
        }
    }

    public establishDesktopControl(
        sockId: string, 
        desktopId: string
    ): void {
        const serverChannel = this.desktopList[desktopId]?.channel;

        const clientTransports = this.getClientTransports(sockId, desktopId);
        const dataConsumer = clientTransports?.controlRecvTransport?.consumer;

        if(dataConsumer && serverChannel){
            dataConsumer.on("message", msg => {
                serverChannel.emit('data', msg);
            });
        }
    }

    public async getRtpCapabilities(
        sockId: string, 
        desktopId: string, 
        ioServer: Server,
        enableAudio: boolean 
    ): Promise<RtpCapabilities|undefined> {

        this.saveSocketId(sockId);
        console.log("Total Client List: " + Object.keys(this.mediaClientList).length);
        if (this.socketIdList.length > this.limitClient && this.socketIdList[0]) {
            //console.log("socketIdList length: " + socketIdList.length);
            ioServer.to(this.socketIdList[0]).emit("end");
        }

        const clientTransports =this.getClientTransports(sockId, desktopId);

        if (clientTransports) {
            console.log("already created client transports");

            const controlRecvTransport = clientTransports.controlRecvTransport;
                if (controlRecvTransport) {
                    console.log("delete controlRecvTransportId: " + controlRecvTransport.id);
                    controlRecvTransport.close();
                }

            const controlSendTransport = clientTransports.controlSendTransport;
            if (controlSendTransport) {
                console.log("delete controlSendTransportId: " + controlSendTransport.id);
                controlSendTransport.close();
            }

            const screenRecvTransport = clientTransports.screenTransport;
            if (screenRecvTransport) {
                console.log("delete screenRecvTransportId: " + screenRecvTransport.id);
                screenRecvTransport.close();
            }

            if(enableAudio){
                const audioRecvTransport = clientTransports.audioTransport;
                if (audioRecvTransport) {
                    console.log("delete audioRecvTransportId: " + audioRecvTransport.id);
                    audioRecvTransport.close();
                }
            }
        }

        if(this.isMediaClient(this.mediaClientList[sockId]) && this.desktopList[desktopId]) {
            if(enableAudio){
                // initialize mediaClient
                const transports = {
                    controlSendTransport: undefined,
                    controlRecvTransport: undefined,
                    screenTransport: undefined,
                    audioTransport: undefined,
                    exits: true
                };

                this.setClientTransports(sockId, desktopId, transports);
            }else{
                // initialize mediaClient
                const transports = {
                    controlSendTransport: undefined,
                    controlRecvTransport: undefined,
                    screenTransport: undefined,
                    exits: true
                };

                this.setClientTransports(sockId, desktopId, transports);
            }

            return this.router.rtpCapabilities;
        }

        return undefined;
    }

    // create ProducerTransport for control
    public async createMediaControl(
        sockId: string, 
        desktopId: string
    ): Promise<createTransportResponse|undefined> {

        const clientTransports = this.getClientTransports(sockId, desktopId);

        if (clientTransports) {

            const { transport, params } = await this.createMediaWebRtcTransport(this.router, this.transportOption);

            transport.observer.on('close', () => {
                transport.close();
                //delete this.producerList[transport.id];
            });
            
            clientTransports.controlSendTransport = transport;
            
            this.setClientTransports(sockId, desktopId, clientTransports);

            return params;
        }
        return undefined;
    }

    // connect event of ProducerTransport for control
    public async connectMediaControl(
        sockId: string, 
        desktopId: string, 
        dtlsParameters: DtlsParameters
    ):Promise<boolean> {
        const clientTransports = this.getClientTransports(sockId, desktopId);
        const controlSendTransport = clientTransports?.controlSendTransport;
        
        if(controlSendTransport){
            await controlSendTransport.connect({ dtlsParameters: dtlsParameters });
            return true;
        }
        return false;
    }

    // produceData event of ProducerTransport for control
    public async establishMediaControl(
        sockId: string, 
        desktopId: string, 
        produceParameters: any
    ):Promise<string|undefined> {

        const clientTransports = this.getClientTransports(sockId, desktopId);
        const controlSendTransport = clientTransports?.controlSendTransport;

        if (controlSendTransport) {
            const dataProducer = await controlSendTransport.produceData(produceParameters);
            //console.log("dataProducer.id: " + dataProducer.id);

            //directconsume
            clientTransports.controlRecvTransport = await this.createDirectConsumer(dataProducer.id);

            this.establishDesktopControl(sockId, desktopId);

            return dataProducer.id;
        }
        return undefined;
    }

    // create ConsumerTransport for screen or audio
    public async createMediaScreenOrAudio(
        sockId: string, 
        desktopId: string, 
        isAudio: boolean
    ): Promise<createTransportResponse|undefined> {
        
        const clientTransports = this.getClientTransports(sockId, desktopId);

        if (clientTransports) {
            const { transport, params } = await this.createMediaWebRtcTransport(this.router, this.transportOption);
            transport.observer.on('close', () => {
                transport.close();
                //delete this.consumerList[transport.id];
            });

            if(isAudio){
                clientTransports.audioTransport = transport;
            }else{
                clientTransports.screenTransport = transport;
            }

            this.setClientTransports(sockId, desktopId, clientTransports);

            return params;
        }

        return undefined;
    }

    // connect event of ConsumerTransport for screen or audio
    public async connectMediaScreenOrAudio(
        sockId: string, 
        desktopId: string, 
        dtlsParameters: mediasoupClientType.DtlsParameters, 
        isAudio: boolean
    ):Promise<boolean> {
        const transports = this.getClientTransports(sockId, desktopId);
        const transport = isAudio ?  transports?.audioTransport : transports?.screenTransport;
        //const transport = mediaClient ? isAudio ? mediaClient[desktopId]?.audioTransport : mediaClient[desktopId]?.screenTransport : undefined;

        if (transport) {
            await transport.connect({ dtlsParameters: dtlsParameters });
            return true;
        }
        return false;
    }

    public async establishMediaScreen(
        sockId: string, 
        desktopId: string
    ): Promise<consumeScreenResponse|undefined> {
        const clientTransports = this.getClientTransports(sockId, desktopId);
        const screenRecvTransport = clientTransports?.screenTransport;
        const screenSendProducerId = this.desktopList[desktopId]?.screenTransport.producer?.id;

        if (screenRecvTransport && screenSendProducerId) {

            const dataConsumer = await screenRecvTransport.consumeData({ dataProducerId: screenSendProducerId, });
            const params = {
                id: dataConsumer.id,
                dataProducerId: dataConsumer.dataProducerId,
                sctpStreamParameters: dataConsumer.sctpStreamParameters,
                label: dataConsumer.label,
                protocol: dataConsumer.protocol,
            };

            screenRecvTransport.consumer = dataConsumer;

            return params;
        }
        return undefined;        
    }

    
    public async establishMediaAudio(
        sockId: string, 
        desktopId: string, 
        rtpCapabilities: mediasoupClientType.RtpCapabilities
    ): Promise<consumeAudioResponse|undefined> {

        const clientTransports = this.getClientTransports(sockId, desktopId);
        const audioRecvTransport = clientTransports?.audioTransport;
        const audioSendProducerId = this.desktopList[desktopId]?.audioTransport?.producer?.id;

        if (audioRecvTransport && audioSendProducerId) {

            const consumer = await audioRecvTransport.consume({
                producerId: audioSendProducerId,
                rtpCapabilities: rtpCapabilities,
                paused: true,
            })
            const params = {
                id: consumer.id,
                producerId: audioSendProducerId,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
            };

            consumer.on('transportclose', () => {
                console.log('transport close from consumer');
            })

            consumer.on('producerclose', () => {
                console.log('producer of consumer closed');
            })

            await consumer.resume();
            audioRecvTransport.consumer = consumer;

            //console.log("consumer audio");

            return params;
        }
        return undefined;
    }

    public disconnectMediaClient(sockId: string): void {

        console.log("discconect client id: " + sockId);

        const mediaClient= this.mediaClientList[sockId];

        if(mediaClient){
            Object.entries(mediaClient).map(([_, value]) =>  {
                if(typeof value !== 'boolean'){
                    const controlRecvTransport = value.controlRecvTransport;
                    if (controlRecvTransport) {
                        console.log("delete controlRecvTransportId: " + controlRecvTransport.id);
                        controlRecvTransport.close();
                    }

                    const controlSendTransport = value.controlSendTransport;
                    if (controlSendTransport) {
                        console.log("delete controlSendTransportId: " + controlSendTransport.id);
                        controlSendTransport.close();
                    }

                    const screenRecvTransport = value.screenTransport;
                    if (screenRecvTransport) {
                        console.log("delete screenRecvTransportId: " + screenRecvTransport.id);
                        screenRecvTransport.close();
                    }

                    const audioRecvTransport = value.audioTransport;
                    if (audioRecvTransport) {
                        console.log("delete audioRecvTransportId: " + audioRecvTransport.id);
                        audioRecvTransport.close();
                    }
                }
                
                delete this.mediaClientList[sockId];
                const indexId = this.socketIdList.indexOf(sockId);
                this.socketIdList.splice(indexId, 1);

                console.log("delete socketIdList length: " + this.socketIdList.length);
            })
        }
    }

    public disconnectDesktop(desktopId: string): void {

        console.log("disconnect desktop server id: " + desktopId);

        const screenSendTransport = this.desktopList[desktopId]?.screenTransport;
        if(screenSendTransport){
            console.log("delete screenSendTransportId: " + screenSendTransport.id);
            screenSendTransport.close();
        }

        const audioSendTransport = this.desktopList[desktopId]?.audioTransport;
        if(audioSendTransport){
            console.log("delete audioSendTransportId: " + audioSendTransport.id);
            audioSendTransport.close();
        }

        delete this.desktopList[desktopId];

        console.log("delete desktopList length: " + Object.entries(this.desktopList).length);
    }

    ///////////////////////////////////////////////////////////////////


    private async startWorker(): Promise<StartWorkerResponse> {
        const worker = await createWorker(this.workerSettings);
        const mediaCodecs: RtpCodecCapability[] | undefined = this.mediaCodecs;
        const router = await worker.createRouter({ mediaCodecs, });
        
        return { worker: worker, router: router };
    }


    private async createMediaWebRtcTransport(
        router: Router,
        transportOption: WebRtcTransportOptions,
    ): Promise<CreateMediaWebRtcTransportResponse> {
        const transport = await router.createWebRtcTransport(transportOption);
        return {
            transport: transport,
            params: {
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters,
                sctpParameters: transport.sctpParameters,
            }
        };
    }

    // --- Producer PlainTransport ---
    // --- send audio
    private async createPlainProducer(rtcpMux: boolean): Promise<AudioSendTransport> {
        const transport: AudioSendTransport = await this.router.createPlainTransport(
            {
                listenIp: this.ip_addr,
                rtcpMux: rtcpMux,
                //rtcpMux: false,
                comedia: true,  // for answerer
                enableSrtp: true,
                srtpCryptoSuite: "AES_CM_128_HMAC_SHA1_80"
            });

        // Read the transport local RTP port.
        const audioRtpPort = transport.tuple.localPort;
        console.log("audioRtpPort: "+audioRtpPort);
        console.log(`tuple: ${JSON.stringify(transport.tuple)}`)

        // If rtcpMux is false, read the transport local RTCP port.
        const audioRtcpPort = transport.rtcpTuple?.localPort;
        console.log("audioRtcpPort: "+audioRtcpPort);

        // If enableSrtp is true, read the transport srtpParameters.
        const srtpParameters = transport.srtpParameters;
        console.log(`srtpParameters: ${JSON.stringify(srtpParameters)}`);

        // If comedia is enabled and SRTP is also enabled, connect() must be called with just the remote srtpParameters.
        if (srtpParameters){
            await transport.connect({
                srtpParameters: srtpParameters
            });
        }

        const audioProducer = await transport.produce(
            {
                kind: 'audio',
                rtpParameters:
                {
                    codecs:
                        [
                            {
                                mimeType: 'audio/opus',
                                clockRate: 48000,
                                payloadType: 101,
                                channels: 2,
                                rtcpFeedback: [],
                                parameters: { sprop_stereo: 1 }
                            }
                        ],
                    encodings: [{ ssrc: 11111111 }]
                }
            });

        transport.producer = audioProducer;

        return transport;
    }


    // --- Producer DirectTransport ---
    // ---  send desktop image
    private async createDirectProducer(): Promise<ScreenSendTransport> {
        const transport: ScreenSendTransport = await this.router.createDirectTransport();

        const dataProducer = await transport.produceData();
        transport.producer = dataProducer;

        console.log("directDataTransport produce id: " + transport.producer.id);

        return transport;
    }

    // --- client data: keyboard,mouse
    private async createDirectConsumer(
        dataProducerId: string
    ): Promise<ControlRecvTransport> {
        console.log("createDirectConsumer");
        const transport: ControlRecvTransport = await this.router.createDirectTransport();

        const dataConsumer = await transport.consumeData({ dataProducerId: dataProducerId });
        transport.consumer = dataConsumer;

        return transport;
    }
}
