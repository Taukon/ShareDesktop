import {
    DataConsumer,
    DtlsParameters,
    Router,
    RtpCapabilities,
    WebRtcTransportOptions,
} from 'mediasoup/node/lib/types';
import { BrowserTransports, BrowserList, BrowserClientList, ControlBrowserRtcTransport, ControlBrowserDirTransport, ScreenBrowserTransport, AudioBrowserTransport, FileWatchTransport } from './manage';
import { createDirectConsumer, createRtcTransport } from '../common';
import { AudioResponse } from './type';
import { 
    ConsumeDataParams, 
    ProduceDataParams, 
    RtcTransportParams 
} from '../common/type';

export class Browser {

    private browserIdList: string[] = [];
    private browserClientList: BrowserClientList = {};


    private initBrowserClient(browserId: string):void {
        if(this.browserIdList.find(v => v == browserId) == undefined){
            this.browserClientList[browserId] = {exits: true} as BrowserList;
            this.browserIdList.push(browserId);
        }
    }

    private isBrowserList(browserList: BrowserList|undefined): browserList is BrowserList { 
        return typeof browserList === 'object' && browserList.exits;
    }

    private isBrowserTransports(browserTransports: BrowserTransports|undefined): browserTransports is BrowserTransports {
        return typeof browserTransports === 'object' && browserTransports.exits;
    }

    private getBrowserTransports(browserId: string, desktopId:string): BrowserTransports|undefined {

        const browserList= this.browserClientList[browserId];
        if(this.isBrowserList(browserList)){
            const transports = browserList[desktopId];

            return this.isBrowserTransports(transports)? transports : undefined;
        }

        return undefined;
    }

    private setControlTransports(
        browserId: string, 
        desktopId:string, 
        controlRtcTransport: ControlBrowserRtcTransport,
        controlDirTransport?: ControlBrowserDirTransport
    ): boolean {
        const browserList= this.browserClientList[browserId];
        if(this.isBrowserList(browserList)){
            const transports = browserList[desktopId];
            if(this.isBrowserTransports(transports)){
                transports.controlRtcTransport = controlRtcTransport;
                transports.controlDirTransport = controlDirTransport;
                return true;
            }
        }
        return false;
    }

    private setScreenTransport(
        browserId: string, 
        desktopId:string, 
        screenBrowserTransport: ScreenBrowserTransport
    ): boolean {
        const browserList= this.browserClientList[browserId];
        if(this.isBrowserList(browserList)){
            const transports = browserList[desktopId];
            if(this.isBrowserTransports(transports)){
                transports.screenTransport = screenBrowserTransport;
                return true;
            }
        }
        return false;
    }

    private setAudioTransport(
        browserId: string, 
        desktopId:string, 
        audioBrowserTransport: AudioBrowserTransport
    ): boolean {
        const browserList= this.browserClientList[browserId];
        if(this.isBrowserList(browserList)){
            const transports = browserList[desktopId];
            if(this.isBrowserTransports(transports)){
                transports.audioTransport = audioBrowserTransport;
                return true;
            }
        }
        return false;
    }

    private setFileWatchTransport(
        browserId: string, 
        desktopId:string, 
        fileWatchTransport: FileWatchTransport
    ): boolean {
        const browserList= this.browserClientList[browserId];
        if(this.isBrowserList(browserList)){
            const transports = browserList[desktopId];
            if(this.isBrowserTransports(transports)){
                transports.fileWatchTransport = fileWatchTransport;
                return true;
            }
        }
        return false;
    }

    private initBrowserTransports(browserId: string, desktopId:string, enableAudio: boolean): boolean {
        
        const browserTransports =this.getBrowserTransports(browserId, desktopId);
        if (browserTransports?.exits) {
            console.log("already created browser transports");

            this.deleteBrowserTransports(browserTransports);
        }

        if(enableAudio){
            console.log(`In Browser enableAudio DesktopID: ${desktopId}`);
        }

        const browserList= this.browserClientList[browserId];
        if(this.isBrowserList(browserList)){
            const transports: BrowserTransports = {
                exits: true
            };
            browserList[desktopId] = transports;
            return true;
        }else{
            return false;
        }
    }

    private deleteBrowserTransports(browserTransports: BrowserTransports) {

        const controlDirTransport = browserTransports.controlDirTransport;
        if (controlDirTransport) {
            console.log("delete controlDirTransportId: " + controlDirTransport.id);
            controlDirTransport.close();
        }

        const controlRtcTransport = browserTransports.controlRtcTransport;
        if (controlRtcTransport) {
            console.log("delete controlRtcTransportId: " + controlRtcTransport.id);
            controlRtcTransport.close();
        }

        const screenRecvTransport = browserTransports.screenTransport;
        if (screenRecvTransport) {
            console.log("delete screenRecvTransportId: " + screenRecvTransport.id);
            screenRecvTransport.close();
        }

        const audioRecvTransport = browserTransports.audioTransport;
        if (audioRecvTransport) {
            console.log("delete audioRecvTransportId: " + audioRecvTransport.id);
            audioRecvTransport.close();
        }

        const fileWatchTransport = browserTransports.fileWatchTransport;
        if (fileWatchTransport) {
            console.log(`delete fileWatchTransportId: ${fileWatchTransport.id}`);
            fileWatchTransport.close();
        }
    }

    public async getRtpCapabilitiesForBrowser(
        browserId: string, 
        desktopId: string, 
        enableAudio: boolean,
        router: Router
    ): Promise<RtpCapabilities|undefined> {

        // initialize 
        this.initBrowserClient(browserId);

        // initialize ClientTransports
        if(this.initBrowserTransports(browserId, desktopId, enableAudio)){
            return router.rtpCapabilities;
        }
        return undefined;
    }

    // create ProducerTransport for control
    public async createBrowserControl(
        browserId: string, 
        desktopId: string,
        router: Router,
        transportOptions :WebRtcTransportOptions
    ): Promise<RtcTransportParams|undefined> {

        const exits = this.getBrowserTransports(browserId, desktopId)?.exits;

        if (exits) {

            const { transport, params } = await createRtcTransport(router, transportOptions);

            transport.observer.on('close', () => {
                transport.close();
                //delete this.producerList[transport.id];
            });
            
            this.setControlTransports(browserId, desktopId, transport);

            return params;
        }
        return undefined;
    }

    // connect event of ProducerTransport for control
    public async connectBrowserControl(
        browserId: string, 
        desktopId: string, 
        dtlsParameters: DtlsParameters
    ):Promise<boolean> {
        const browserTransports = this.getBrowserTransports(browserId, desktopId);
        const controlRtcTransport = browserTransports?.controlRtcTransport;
        
        if(controlRtcTransport){
            await controlRtcTransport.connect({ dtlsParameters: dtlsParameters });
            return true;
        }
        return false;
    }

    // produceData event of ProducerTransport for control
    public async establishBrowserControl(
        browserId: string, 
        desktopId: string, 
        router: Router,
        produceParameters: ProduceDataParams,
        establishControl: (
                browserId: string, 
                desktopId: string
            ) => void
    ):Promise<string|undefined> {

        const browserTransports = this.getBrowserTransports(browserId, desktopId);
        const controlSendTransport = browserTransports?.controlRtcTransport;

        if (controlSendTransport) {
            const dataProducer = await controlSendTransport.produceData(produceParameters);
            //console.log("dataProducer.id: " + dataProducer.id);

            //directconsume
            browserTransports.controlDirTransport = await createDirectConsumer(router, dataProducer.id);

            establishControl(browserId, desktopId);

            return dataProducer.id;
        }
        return undefined;
    }

    // create ConsumerTransport for screen or audio
    public async createBrowserScreenOrAudio(
        browserId: string, 
        desktopId: string, 
        isAudio: boolean,
        router: Router,
        transportOptions :WebRtcTransportOptions
    ): Promise<RtcTransportParams|undefined> {
        
        const exits = this.getBrowserTransports(browserId, desktopId)?.exits;

        if (exits) {
            const { transport, params } = await createRtcTransport(router, transportOptions);
            transport.observer.on('close', () => {
                transport.close();
                //delete this.consumerList[transport.id];
            });

            if(isAudio){
                this.setAudioTransport(browserId, desktopId, transport);
            }else{
                this.setScreenTransport(browserId, desktopId, transport);
            }

            return params;
        }

        return undefined;
    }

    // connect event of ConsumerTransport for screen or audio
    public async connectBrowserScreenOrAudio(
        browserId: string, 
        desktopId: string, 
        dtlsParameters: DtlsParameters, 
        isAudio: boolean
    ):Promise<boolean> {
        const transports = this.getBrowserTransports(browserId, desktopId);
        const transport = isAudio ?  transports?.audioTransport : transports?.screenTransport;

        if (transport) {
            await transport.connect({ dtlsParameters: dtlsParameters });
            return true;
        }
        return false;
    }

    public async establishBrowserScreen(
        browserId: string, 
        desktopId: string,
        screenSendProducerId: string|undefined
    ): Promise<ConsumeDataParams|undefined> {
        const clientTransports = this.getBrowserTransports(browserId, desktopId);
        const screenRecvTransport = clientTransports?.screenTransport;
        //const screenSendProducerId = this.getDesktopTransports(desktopId)?.screenTransport?.producer?.id;

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

    
    public async establishBrowserAudio(
        browserId: string, 
        desktopId: string,
        audioSendProducerId: string|undefined,
        rtpCapabilities: RtpCapabilities
    ): Promise<AudioResponse|undefined> {

        const browserTransports = this.getBrowserTransports(browserId, desktopId);
        const audioRecvTransport = browserTransports?.audioTransport;
        //const audioSendProducerId = this.getDesktopTransports(desktopId)?.audioTransport?.producer?.id;

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

    // create ConsumerTransport for screen or audio
    public async createFileWatch(
        browserId: string, 
        desktopId: string, 
        router: Router,
        transportOptions :WebRtcTransportOptions
    ): Promise<RtcTransportParams|undefined> {
        
        const exits = this.getBrowserTransports(browserId, desktopId)?.exits;

        if (exits) {
            const { transport, params } = await createRtcTransport(router, transportOptions);
            transport.observer.on('close', () => {
                transport.close();
                //delete this.consumerList[transport.id];
            });

            this.setFileWatchTransport(browserId, desktopId, transport);

            return params;
        }

        return undefined;
    }

    // connect event of ConsumerTransport for screen or audio
    public async connectFileWatch(
        browserId: string, 
        desktopId: string, 
        dtlsParameters: DtlsParameters, 
    ):Promise<boolean> {
        const transports = this.getBrowserTransports(browserId, desktopId);
        const transport = transports?.fileWatchTransport;

        if (transport) {
            await transport.connect({ dtlsParameters: dtlsParameters });
            return true;
        }
        return false;
    }

    public async establishFileWatch(
        browserId: string, 
        desktopId: string,
        watchProducerId: string|undefined
    ): Promise<ConsumeDataParams|undefined> {
        const clientTransports = this.getBrowserTransports(browserId, desktopId);
        const watchRecvTransport = clientTransports?.fileWatchTransport;

        if (watchRecvTransport && watchProducerId) {

            const dataConsumer = await watchRecvTransport.consumeData({ dataProducerId: watchProducerId });
            const params = {
                id: dataConsumer.id,
                dataProducerId: dataConsumer.dataProducerId,
                sctpStreamParameters: dataConsumer.sctpStreamParameters,
                label: dataConsumer.label,
                protocol: dataConsumer.protocol,
            };

            watchRecvTransport.consumer = dataConsumer;

            return params;
        }
        return undefined;        
    }

    public disconnectBrowserClient(browserId: string): void {

        console.log("discconect browser id: " + browserId);

        const browserList= this.browserClientList[browserId];

        if(browserList?.exits){
            Object.entries(browserList).map(([_, browserTransports]) =>  {
                if(typeof browserTransports !== 'boolean'){
                    this.deleteBrowserTransports(browserTransports);
                }
                
                delete this.browserClientList[browserId];
                const indexId = this.browserIdList.indexOf(browserId);
                this.browserIdList.splice(indexId, 1);

                console.log("delete clientIdList length: " + this.browserIdList.length);
            })
        }
    }

    public verifyTotal(limitBrowser: number):string|undefined {
        console.log("Total Client List: " + Object.keys(this.browserClientList).length);
        if (this.browserIdList.length + 1 > limitBrowser && this.browserIdList[0]) {
            //console.log("clientIdList length: " + clientIdList.length);
            return this.browserIdList[0];
            
        }
        return undefined;
    }

    public getControlDirConsumer(
        browserId: string, 
        desktopId: string
    ): DataConsumer|undefined {
        const browserTransports = this.getBrowserTransports(browserId, desktopId);
        return browserTransports?.controlDirTransport?.consumer;
    }
}