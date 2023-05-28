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
import {
    AudioDesktopTransport,
    AudioResponse,
    ClientTransports,
    ConsumeAudioResponse,
    ConsumeDataResponse,
    ControlClientDirTransport,
    ControlDesktopDirTransport,
    CreateRtcTransportResponse,
    CreateTransportResponse,
    DesktopList,
    DesktopTransports,
    MediaClient,
    MediaClientList,
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
    private clientIdList: string[] = [];
    private mediaClientList: MediaClientList = {}
    private desktopList: DesktopList = {};
    private limitClient: number;
    private limitDesktop: number;

    constructor(
        limitClient: number,
        limitDesktop: number,
        transportOption: WebRtcTransportOptions, 
        workerSettings: WorkerSettings, 
        mediaCodecs: RtpCodecCapability[],
        ip_addr: string
    ){
        this.limitClient = limitClient;
        this.limitDesktop = limitDesktop;
        this.ip_addr = ip_addr;

        
        this.transportOption = transportOption;
        this.workerSettings = workerSettings;
        this.mediaCodecs = mediaCodecs;
        
        this.startWorker().then((v) => {
            this.router = v.router;
        });
    }


    private initMediaClient(clientId: string):void {
        if(this.clientIdList.find(v => v == clientId) == undefined){
            this.mediaClientList[clientId] = {exits: true} as MediaClient;
            this.clientIdList.push(clientId);
        }
    }

    private isMediaClient(mediaClient: MediaClient|undefined): mediaClient is MediaClient { 
        return typeof mediaClient === 'object' && mediaClient.exits;
    }

    private isClientTransports(clientTransports: ClientTransports|undefined): clientTransports is ClientTransports {
        return typeof clientTransports === 'object' && clientTransports.exits;
    }

    private getClientTransports(clientId: string, desktopId:string): ClientTransports|undefined {

        const mediaClient= this.mediaClientList[clientId];
        if(this.isMediaClient(mediaClient)){
            const transports = mediaClient[desktopId];

            return this.isClientTransports(transports)? transports : undefined;
        }

        return undefined;
    }

    private setClientTransports(clientId: string, desktopId:string, clientTransports: ClientTransports): boolean {
        const mediaClient= this.mediaClientList[clientId];
        if(this.isMediaClient(mediaClient) && this.isClientTransports(clientTransports)){
            mediaClient[desktopId] = clientTransports;
            this.mediaClientList[clientId] = mediaClient;
            return true;
        }
        return false;
    }

    private initClientTransports(clientId: string, desktopId:string, enableAudio: boolean): boolean {
        if(enableAudio){
            const transports: ClientTransports = {
                controlRtcTransport: undefined,
                controlDirTransport: undefined,
                screenTransport: undefined,
                audioTransport: undefined,
                exits: true
            };
            return this.setClientTransports(clientId, desktopId, transports);
        }else{
            const transports: ClientTransports = {
                controlRtcTransport: undefined,
                controlDirTransport: undefined,
                screenTransport: undefined,
                exits: true
            };
            return this.setClientTransports(clientId, desktopId, transports);
        }
    }

    private isDesktopTransports(desktopTransports: DesktopTransports|undefined): desktopTransports is DesktopTransports {
        return typeof desktopTransports === 'object'    && desktopTransports.exits;
    }

    private getDesktopTransports(desktopId:string): DesktopTransports|undefined {
        const desktopTransports = this.desktopList[desktopId];
        if(desktopTransports){
            return this.isDesktopTransports(desktopTransports)? desktopTransports : undefined;
        }
        return undefined;
    }

    private setDesktopTransports(desktopId: string, desktopTransports: DesktopTransports): boolean {
        if(this.isDesktopTransports(desktopTransports)){
            this.desktopList[desktopId] = desktopTransports;
            return true;
        }
        return false;
    }

    private initDesktopTransports(desktopId:string, enableAudio: boolean): boolean {
        if(enableAudio) {
            const transports: DesktopTransports = {
                controlRtcTransport: undefined,
                controlDirTransport: undefined,
                screenTransport: undefined,
                audioTransport: undefined,
                exits: true
            }
            return this.setDesktopTransports(desktopId, transports);
        }else{
            const transports: DesktopTransports = {
                controlRtcTransport: undefined,
                controlDirTransport: undefined,
                screenTransport: undefined,
                exits: true
            }
            return this.setDesktopTransports(desktopId, transports);
        }
    }

    public establishControl(
        clientId: string, 
        desktopId: string
    ): void {
        const clientTransports = this.getClientTransports(clientId, desktopId);
        const dataConsumer = clientTransports?.controlDirTransport?.consumer;

        const desktopTransports = this.getDesktopTransports(desktopId);
        const dataProducer = desktopTransports?.controlDirTransport?.producer;

        if(dataConsumer && dataProducer){
            dataConsumer.on("message", msg => {
                dataProducer.send(msg);
            });
        }
    }

    // ----------------- Client ------------------------

    public checkClientTotal():string|undefined {
        console.log("Total Client List: " + Object.keys(this.mediaClientList).length);
        if (this.clientIdList.length + 1 > this.limitClient && this.clientIdList[0]) {
            //console.log("clientIdList length: " + clientIdList.length);
            return this.clientIdList[0];
            
        }
        return undefined;
    }

    public async getRtpCapabilitiesForClient(
        clientId: string, 
        desktopId: string, 
        enableAudio: boolean,
    ): Promise<RtpCapabilities|undefined> {

        // initialize mediaClient
        this.initMediaClient(clientId);

        const clientTransports =this.getClientTransports(clientId, desktopId);
        if (clientTransports?.exits) {
            console.log("already created client transports");

            const controlDirTransport = clientTransports.controlDirTransport;
            if (controlDirTransport) {
                console.log("delete controlDirTransportId: " + controlDirTransport.id);
                controlDirTransport.close();
            }

            const controlRtcTransport = clientTransports.controlRtcTransport;
            if (controlRtcTransport) {
                console.log("delete controlRtcTransportId: " + controlRtcTransport.id);
                controlRtcTransport.close();
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

        // initialize ClientTransports
        if(this.initClientTransports(clientId, desktopId, enableAudio)){
            return this.router.rtpCapabilities;
        }
        return undefined;
    }

    // create ProducerTransport for control
    public async createMediaControl(
        clientId: string, 
        desktopId: string
    ): Promise<CreateTransportResponse|undefined> {

        const clientTransports = this.getClientTransports(clientId, desktopId);

        if (clientTransports?.exits) {

            const { transport, params } = await this.createRtcTransport(this.router, this.transportOption);

            transport.observer.on('close', () => {
                transport.close();
                //delete this.producerList[transport.id];
            });
            
            clientTransports.controlRtcTransport = transport;
            
            this.setClientTransports(clientId, desktopId, clientTransports);

            return params;
        }
        return undefined;
    }

    // connect event of ProducerTransport for control
    public async connectMediaControl(
        clientId: string, 
        desktopId: string, 
        dtlsParameters: DtlsParameters
    ):Promise<boolean> {
        const clientTransports = this.getClientTransports(clientId, desktopId);
        const controlRtcTransport = clientTransports?.controlRtcTransport;
        
        if(controlRtcTransport){
            await controlRtcTransport.connect({ dtlsParameters: dtlsParameters });
            return true;
        }
        return false;
    }

    // produceData event of ProducerTransport for control
    public async establishMediaControl(
        clientId: string, 
        desktopId: string, 
        produceParameters: any
    ):Promise<string|undefined> {

        const clientTransports = this.getClientTransports(clientId, desktopId);
        const controlSendTransport = clientTransports?.controlRtcTransport;

        if (controlSendTransport) {
            const dataProducer = await controlSendTransport.produceData(produceParameters);
            //console.log("dataProducer.id: " + dataProducer.id);

            //directconsume
            clientTransports.controlDirTransport = await this.createDirectConsumer(dataProducer.id);

            this.establishControl(clientId, desktopId);

            return dataProducer.id;
        }
        return undefined;
    }

    // create ConsumerTransport for screen or audio
    public async createMediaScreenOrAudio(
        clientId: string, 
        desktopId: string, 
        isAudio: boolean
    ): Promise<CreateTransportResponse|undefined> {
        
        const clientTransports = this.getClientTransports(clientId, desktopId);

        if (clientTransports) {
            const { transport, params } = await this.createRtcTransport(this.router, this.transportOption);
            transport.observer.on('close', () => {
                transport.close();
                //delete this.consumerList[transport.id];
            });

            if(isAudio){
                clientTransports.audioTransport = transport;
            }else{
                clientTransports.screenTransport = transport;
            }

            this.setClientTransports(clientId, desktopId, clientTransports);

            return params;
        }

        return undefined;
    }

    // connect event of ConsumerTransport for screen or audio
    public async connectMediaScreenOrAudio(
        clientId: string, 
        desktopId: string, 
        dtlsParameters: mediasoupClientType.DtlsParameters, 
        isAudio: boolean
    ):Promise<boolean> {
        const transports = this.getClientTransports(clientId, desktopId);
        const transport = isAudio ?  transports?.audioTransport : transports?.screenTransport;
        //const transport = mediaClient ? isAudio ? mediaClient[desktopId]?.audioTransport : mediaClient[desktopId]?.screenTransport : undefined;

        if (transport) {
            await transport.connect({ dtlsParameters: dtlsParameters });
            return true;
        }
        return false;
    }

    public async establishMediaScreen(
        clientId: string, 
        desktopId: string
    ): Promise<ConsumeDataResponse|undefined> {
        const clientTransports = this.getClientTransports(clientId, desktopId);
        const screenRecvTransport = clientTransports?.screenTransport;
        const screenSendProducerId = this.getDesktopTransports(desktopId)?.screenTransport?.producer?.id;

        if (screenRecvTransport && screenSendProducerId) {

            const dataConsumer = await screenRecvTransport.consumeData({ dataProducerId: screenSendProducerId });
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
        clientId: string, 
        desktopId: string, 
        rtpCapabilities: mediasoupClientType.RtpCapabilities
    ): Promise<ConsumeAudioResponse|undefined> {

        const clientTransports = this.getClientTransports(clientId, desktopId);
        const audioRecvTransport = clientTransports?.audioTransport;
        const audioSendProducerId = this.getDesktopTransports(desktopId)?.audioTransport?.producer?.id;

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

    public disconnectMediaClient(clientId: string): void {

        console.log("discconect client id: " + clientId);

        const mediaClient= this.mediaClientList[clientId];

        if(mediaClient?.exits){
            Object.entries(mediaClient).map(([_, value]) =>  {
                if(typeof value !== 'boolean'){
                    const controlDirTransport = value.controlDirTransport;
                    if (controlDirTransport) {
                        console.log("delete controlDirTransportId: " + controlDirTransport.id);
                        controlDirTransport.close();
                    }

                    const controlRtcTransport = value.controlRtcTransport;
                    if (controlRtcTransport) {
                        console.log("delete controlRtcTransportId: " + controlRtcTransport.id);
                        controlRtcTransport.close();
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
                
                delete this.mediaClientList[clientId];
                const indexId = this.clientIdList.indexOf(clientId);
                this.clientIdList.splice(indexId, 1);

                console.log("delete clientIdList length: " + this.clientIdList.length);
            })
        }
    }

    // ------------------------ Desktop --------------------------

    public checkDesktopTotal():string|undefined {
        const desktopIds = Object.keys(this.desktopList);
        console.log("Total Desktop List: " + desktopIds.length);
        if (desktopIds.length + 1 > this.limitDesktop &&  desktopIds[0]) {
            //console.log("desktopIds length: " + desktopIds.length);
            return desktopIds[0];
        }
        return undefined;
    }

    public async getRtpCapabilitiesForDesktop(
        desktopId: string, 
        enableAudio: boolean,
    ): Promise<RtpCapabilities|undefined> {

        const desktopTransports = this.getDesktopTransports(desktopId);
        if(desktopTransports?.exits){
            console.log("already created Desktop transports");

            const controlDirTransport = desktopTransports.controlDirTransport;
            if (controlDirTransport) {
                console.log("delete controlDirTransportId: " + controlDirTransport.id);
                controlDirTransport.close();
            }
            const controlRtcTransport = desktopTransports.controlRtcTransport;
            if (controlRtcTransport) {
                console.log("delete controlRtcTransportId: " + controlRtcTransport.id);
                controlRtcTransport.close();
            }
            const screenTransport = desktopTransports.screenTransport;
            if (screenTransport) {
                console.log("delete screenTransportId: " + screenTransport.id);
                screenTransport.close();
            }
            if(enableAudio){
                const audioTransport = desktopTransports.audioTransport;
                if (audioTransport) {
                    console.log("delete audioTransportId: " + audioTransport.id);
                    audioTransport.close();
                }
            }
        }

        // initialize DesktopTransports
        if(this.initDesktopTransports(desktopId, enableAudio)){
            return this.router.rtpCapabilities;
        }
        return undefined;
    }

    // create ConsumerTransport for control
    public async createDesktopControl(desktopId: string):Promise<CreateTransportResponse|undefined> {
        const desktopTransports = this.getDesktopTransports(desktopId);

        if(desktopTransports?.exits) {
            const { transport, params } = await this.createRtcTransport(this.router, this.transportOption);
        
            transport.observer.on('close', () => {
                transport.close();
                //delete this.producerList[transport.id];
            });

            desktopTransports.controlRtcTransport = transport;

            desktopTransports.controlDirTransport = await this.createDirectProducer();

            this.setDesktopTransports(desktopId, desktopTransports);

            return params;
        }
        return undefined;
    }

    // connect event of ConsumerTransport for control
    public async connectDesktopControl(
        desktopId: string, 
        dtlsParameters: mediasoupClientType.DtlsParameters
    ):Promise<boolean> {
        const desktopTransports = this.getDesktopTransports(desktopId);
        const controlRtcTransport = desktopTransports?.controlRtcTransport;

        if(controlRtcTransport){
            await controlRtcTransport.connect({ dtlsParameters: dtlsParameters });
            return true;
        }
        return false;
    }

    // consumeData event of ConsumerTransport for control
    public async establishDesktopControl(
        desktopId: string
    ): Promise<ConsumeDataResponse|undefined> {
        const desktopTransports = this.getDesktopTransports(desktopId);
        const controlRtcTransport = desktopTransports?.controlRtcTransport;
        const controlDirProducerId = desktopTransports?.controlDirTransport?.producer?.id
        
        if(controlRtcTransport && controlDirProducerId) {    
            const dataConsumer = await controlRtcTransport.consumeData({ dataProducerId: controlDirProducerId});
            const params = {
                id: dataConsumer.id,
                dataProducerId: dataConsumer.dataProducerId,
                sctpStreamParameters: dataConsumer.sctpStreamParameters,
                label: dataConsumer.label,
                protocol: dataConsumer.protocol,
            };

            controlRtcTransport.consumer = dataConsumer;
            return params;
        }
        return undefined;
    }

    //create ProducerTransport for screen
    public async createDesktopScreen(desktopId: string): Promise<CreateTransportResponse|undefined> {
        const desktopTransports = this.getDesktopTransports(desktopId);

        if(desktopTransports?.exits) {
            const { transport, params } = await this.createRtcTransport(this.router, this.transportOption);
        
            transport.observer.on('close', () => {
                transport.close();
                //delete this.producerList[transport.id];
            });

            desktopTransports.screenTransport = transport;

            this.setDesktopTransports(desktopId, desktopTransports);

            return params;
        }

        return undefined;
    }   

    // connect event of ProducerTransport for screen
    public async connectDesktopScreen(
        desktopId: string, 
        dtlsParameters: DtlsParameters
    ):Promise<boolean> {
        const desktopTransports = this.getDesktopTransports(desktopId);
        const screenTransport = desktopTransports?.screenTransport;

        if(screenTransport) {
            await screenTransport.connect({ dtlsParameters: dtlsParameters });
            return true;
        }
        return false;
    }

    // produceData event of ProducerTransport for screen
    public async establishDesktopScreen(
        desktopId: string, 
        produceParameters: any
    ):Promise<string|undefined> {
        const desktopTransports = this.getDesktopTransports(desktopId);
        const screenTransport = desktopTransports?.screenTransport;

        if(screenTransport){
            const dataProducer = await screenTransport.produceData(produceParameters);
            //console.log("dataProducer.id: " + dataProducer.id);
            screenTransport.producer = dataProducer;
            return dataProducer.id;
        }
        return undefined;
    }

    public async createDesktopAudio(desktopId: string, rtcpMux: boolean):Promise<boolean> {
        const desktopTransports = this.getDesktopTransports(desktopId);
        if(desktopTransports?.exits){
            const audioTransport = await this.createPlainProducer(rtcpMux);
            desktopTransports.audioTransport = audioTransport;
            this.setDesktopTransports(desktopId, desktopTransports);
            return true;
        }
        return false;
    }

    public establishDesktopAudio(desktopId: string): AudioResponse|undefined {
        const desktopTransports = this.getDesktopTransports(desktopId);
        const audioSendTransport = desktopTransports?.audioTransport;

        // connect audio between transport and serverChannel
        if(audioSendTransport){

            const localIp = audioSendTransport.tuple.localIp;

                // Read the transport local RTP port.
                const audioRtpPort = audioSendTransport.tuple.localPort;
                // If rtcpMux is false, read the transport local RTCP port.
                const audioRtcpPort = audioSendTransport.rtcpTuple?.localPort;
                // If enableSrtp is true, read the transport srtpParameters.
                const srtpParameters = audioSendTransport.srtpParameters;

                const msg: AudioResponse = { 
                    rtp: audioRtpPort, 
                    rtcp: audioRtcpPort, 
                    ip_addr: localIp, 
                    srtpParameters: srtpParameters 
                };

            return msg;
        }
        return undefined;
    }

    public disconnectDesktop(desktopId: string): void {

        console.log("disconnect desktop server id: " + desktopId);

        const desktopTransports = this.getDesktopTransports(desktopId);
        if(desktopTransports?.exits){
            const controlDirTransport = desktopTransports.controlDirTransport;
            if(controlDirTransport){
                console.log("delete controlDirTransportId: " + controlDirTransport.id);
                controlDirTransport.close();
            }

            const controlRtcTransport = desktopTransports.controlRtcTransport;
            if(controlRtcTransport){
                console.log("delete controlRtcTransportId: " + controlRtcTransport.id);
                controlRtcTransport.close();
            }

            const screenTransport = desktopTransports.screenTransport;
            if(screenTransport){
                console.log("delete screenTransportId: " + screenTransport.id);
                screenTransport.close();
            }

            const audioTransport = this.desktopList[desktopId]?.audioTransport;
            if(audioTransport){
                console.log("delete audioTransportId: " + audioTransport.id);
                audioTransport.close();
            }

            delete this.desktopList[desktopId];
            console.log("delete desktopList length: " + Object.entries(this.desktopList).length);
        }
    }

    ///////////////////////////////////////////////////////////////////


    private async startWorker(): Promise<StartWorkerResponse> {
        const worker = await createWorker(this.workerSettings);
        const mediaCodecs: RtpCodecCapability[] | undefined = this.mediaCodecs;
        const router = await worker.createRouter({ mediaCodecs, });
        
        return { worker: worker, router: router };
    }


    private async createRtcTransport(
        router: Router,
        transportOption: WebRtcTransportOptions,
    ): Promise<CreateRtcTransportResponse> {
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
    private async createPlainProducer(rtcpMux: boolean): Promise<AudioDesktopTransport> {
        const transport: AudioDesktopTransport = await this.router.createPlainTransport(
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

    // // --- Producer DirectTransport ---
    private async createDirectProducer(): Promise<ControlDesktopDirTransport> {
        const transport: ControlDesktopDirTransport = await this.router.createDirectTransport();

        const dataProducer = await transport.produceData();
        transport.producer = dataProducer;

        console.log("directDataTransport produce id: " + transport.producer.id);

        return transport;
    }

    // --- Consumer DirectTransport
    private async createDirectConsumer(
        dataProducerId: string
    ): Promise<ControlClientDirTransport> {
        //console.log("createDirectConsumer");
        const transport: ControlClientDirTransport = await this.router.createDirectTransport();

        const dataConsumer = await transport.consumeData({ dataProducerId: dataProducerId });
        transport.consumer = dataConsumer;

        return transport;
    }
}
