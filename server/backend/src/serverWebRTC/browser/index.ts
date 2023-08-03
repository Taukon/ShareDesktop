import {
    DataConsumer,
    DtlsParameters,
    Router,
    RtpCapabilities,
    WebRtcTransportOptions,
} from 'mediasoup/node/lib/types';
import * as mediasoupClientType from "mediasoup-client/lib/types";
import { BrowserTransports, BrowserList, BrowserClientList } from './manage';
import { createDirectConsumer, createRtcTransport } from '../common';
import { AudioResponse, DataConsumerParams, RtcTransportParams } from './type';

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

    private setBrowserTransports(browserId: string, desktopId:string, browserTransports: BrowserTransports): boolean {
        const browserList= this.browserClientList[browserId];
        if(this.isBrowserList(browserList) && this.isBrowserTransports(browserTransports)){
            browserList[desktopId] = browserTransports;
            this.browserClientList[browserId] = browserList;
            return true;
        }
        return false;
    }

    private initBrowserTransports(browserId: string, desktopId:string, enableAudio: boolean): boolean {
        if(enableAudio){
            const transports: BrowserTransports = {
                controlRtcTransport: undefined,
                controlDirTransport: undefined,
                screenTransport: undefined,
                audioTransport: undefined,
                exits: true
            };
            return this.setBrowserTransports(browserId, desktopId, transports);
        }else{
            const transports: BrowserTransports = {
                controlRtcTransport: undefined,
                controlDirTransport: undefined,
                screenTransport: undefined,
                exits: true
            };
            return this.setBrowserTransports(browserId, desktopId, transports);
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
    }

    public async getRtpCapabilitiesForBrowser(
        browserId: string, 
        desktopId: string, 
        enableAudio: boolean,
        router: Router
    ): Promise<RtpCapabilities|undefined> {

        // initialize 
        this.initBrowserClient(browserId);

        const browserTransports =this.getBrowserTransports(browserId, desktopId);
        if (browserTransports?.exits) {
            console.log("already created browser transports");

            this.deleteBrowserTransports(browserTransports);
        }

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

        const browserTransports = this.getBrowserTransports(browserId, desktopId);

        if (browserTransports?.exits) {

            const { transport, params } = await createRtcTransport(router, transportOptions);

            transport.observer.on('close', () => {
                transport.close();
                //delete this.producerList[transport.id];
            });
            
            browserTransports.controlRtcTransport = transport;
            
            this.setBrowserTransports(browserId, desktopId, browserTransports);

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
        produceParameters: any,
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
        
        const clientTransports = this.getBrowserTransports(browserId, desktopId);

        if (clientTransports) {
            const { transport, params } = await createRtcTransport(router, transportOptions);
            transport.observer.on('close', () => {
                transport.close();
                //delete this.consumerList[transport.id];
            });

            if(isAudio){
                clientTransports.audioTransport = transport;
            }else{
                clientTransports.screenTransport = transport;
            }

            this.setBrowserTransports(browserId, desktopId, clientTransports);

            return params;
        }

        return undefined;
    }

    // connect event of ConsumerTransport for screen or audio
    public async connectBrowserScreenOrAudio(
        browserId: string, 
        desktopId: string, 
        dtlsParameters: mediasoupClientType.DtlsParameters, 
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
    ): Promise<DataConsumerParams|undefined> {
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
        rtpCapabilities: mediasoupClientType.RtpCapabilities
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