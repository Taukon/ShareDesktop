import {
    Router,
    RtpCodecCapability,
    WebRtcTransportOptions,
    WorkerSettings,
    DtlsParameters,
    RtpCapabilities
} from "mediasoup/node/lib/types";
import { startWorker } from "./common";
import { Desktop } from "./desktop";
import { Browser } from "./browser";
import { FileTransfer } from "./fileTransfer";
import { ProduceDataParams } from "./common/type";

export class ServerWebRTC {

    private ipAddr: string;
    private router!: Router;
    private transportOptions: WebRtcTransportOptions;
    private workerSettings: WorkerSettings;
    private mediaCodecs: RtpCodecCapability[];

    private limitBrowser: number;
    private limitDesktop: number;
    private limitFileTransfer: number= 10;

    private desktop = new Desktop();
    private browser = new Browser();
    private fileTransfer = new FileTransfer();

    constructor(
        limitDesktop: number,
        limitBrowser: number,
        transportOptions: WebRtcTransportOptions, 
        workerSettings: WorkerSettings, 
        mediaCodecs: RtpCodecCapability[],
        ipAddr: string
    ){
        this.limitBrowser = limitBrowser;
        this.limitDesktop = limitDesktop;
        this.ipAddr = ipAddr;

        
        this.transportOptions = transportOptions;
        this.workerSettings = workerSettings;
        this.mediaCodecs = mediaCodecs;
        
        startWorker(this.workerSettings, this.mediaCodecs).then((v) => {
            this.router = v.router;
        });
    }

    private establishControl(
        browserId: string, 
        desktopId: string
    ): void {
        const dataConsumer = this.browser.getControlDirConsumer(browserId, desktopId);
        const dataProducer = this.desktop.getControlDirProducer(desktopId);

        if(dataConsumer && dataProducer){
            dataConsumer.on("message", msg => {
                dataProducer.send(msg);
            });
        }
    }

    // ------------------------ Desktop --------------------------

    public async getRtpCapabilitiesForDesktop(
        desktopId: string, 
        enableAudio: boolean
    ) {
        return await this.desktop.getRtpCapabilitiesForDesktop(
            desktopId, 
            enableAudio, 
            this.router
        );
    }

    public async createDesktopControl(desktopId: string) {
        return await this.desktop.createDesktopControl(
            desktopId, 
            this.router, 
            this.transportOptions
        );
    }

    public async connectDesktopControl(
        desktopId: string, 
        dtlsParameters: DtlsParameters
    ) {
        return await this.desktop.connectDesktopControl(desktopId, dtlsParameters);
    }

    public async establishDesktopControl(desktopId: string) {
        return await this.desktop.establishDesktopControl(desktopId);
    }

    public async createDesktopScreen(desktopId: string) {
        return await this.desktop.createDesktopScreen(
            desktopId, 
            this.router, 
            this.transportOptions
        );
    }

    public async connectDesktopScreen(
        desktopId: string, 
        dtlsParameters: DtlsParameters
    ) {
        return await this.desktop.connectDesktopScreen(desktopId, dtlsParameters);
    }

    public async establishDesktopScreen(
        desktopId: string, 
        produceParameters: ProduceDataParams
    ) {
        return await this.desktop.establishDesktopScreen(
            desktopId, 
            produceParameters
        );
    }

    public async createDesktopAudio(
        desktopId: string, 
        rtcpMux: boolean
    ) {
        return await this.desktop.createDesktopAudio(
            desktopId, 
            this.router, 
            this.ipAddr, 
            rtcpMux
        );
    }

    public establishDesktopAudio(desktopId: string) {
        return this.desktop.establishDesktopAudio(desktopId);
    }

    public disconnectDesktop(desktopId: string) {
        return this.desktop.disconnectDesktop(desktopId);
    }

    public verifyTotalDesktop() {
        return this.desktop.verifyTotal(this.limitDesktop);
    }

    // ----------------- Browser ------------------------

    public async getRtpCapabilitiesForBrowser(
        browserId: string, 
        desktopId: string, 
        enableAudio: boolean,
    ) {
        return await this.browser.getRtpCapabilitiesForBrowser(
            browserId, 
            desktopId, 
            enableAudio, 
            this.router
        );
    }

    public async createBrowserControl(
        browserId: string, 
        desktopId: string
    ) {
        return await this.browser.createBrowserControl(
            browserId, 
            desktopId, 
            this.router, 
            this.transportOptions
        );
    }

    public async connectBrowserControl(
        browserId: string, 
        desktopId: string, 
        dtlsParameters: DtlsParameters
    ) {
        return await this.browser.connectBrowserControl(
            browserId, 
            desktopId, 
            dtlsParameters
        );
    }

    public async establishBrowserControl(
        browserId: string, 
        desktopId: string, 
        produceParameters: ProduceDataParams
    ) {
        return await this.browser.establishBrowserControl(
            browserId, 
            desktopId, 
            this.router, 
            produceParameters, 
            (browserId, desktopId) => this.establishControl(browserId, desktopId)
        );
    }

    public async createBrowserScreenOrAudio(
        browserId: string, 
        desktopId: string, 
        isAudio: boolean
    ) {
        return await this.browser.createBrowserScreenOrAudio(
            browserId, 
            desktopId, 
            isAudio, 
            this.router, 
            this.transportOptions
        );
    }

    public async connectBrowserScreenOrAudio(
        browserId: string, 
        desktopId: string, 
        dtlsParameters: DtlsParameters, 
        isAudio: boolean
    ) {
        return await this.browser.connectBrowserScreenOrAudio(
            browserId,
            desktopId,
            dtlsParameters,
            isAudio
        );
    }

    public async establishBrowserScreen(
        browserId: string, 
        desktopId: string
    ) {
        return await this.browser.establishBrowserScreen(
            browserId, 
            desktopId, 
            this.desktop.getScreenSendProducerId(desktopId)
        );
    }

    public async establishBrowserAudio(
        browserId: string, 
        desktopId: string,
        rtpCapabilities: RtpCapabilities
    ) {
        return await this.browser.establishBrowserAudio(
            browserId,
            desktopId,
            this.desktop.getAudioSendProducerId(desktopId),
            rtpCapabilities
        )
    }

    public disconnectBrowserClient(browserId: string) {
        return this.browser.disconnectBrowserClient(browserId);
    }

    public verifyTotalBrowser() {
        return this.browser.verifyTotal(this.limitBrowser);
    }

    // ------------ File Transfer ---------------

    public initFileTransfer() {
        if(!this.fileTransfer.verifyTotal(this.limitFileTransfer)){
            console.log(`limit FieTransfer Total`);
            return undefined;
        }

        const transferId = this.fileTransfer.getRandomId();
        if(this.fileTransfer.initFileTransports(transferId)){
            return transferId;
        }
        return undefined;
    }

    public disconnectFileTransfer(fileTransferId: string) {
        return this.fileTransfer.deleteFileTransports(fileTransferId);
    }

    public async createRecvFile(fileTransferId: string) {
        return await this.fileTransfer.createRecvFile(
            fileTransferId,
            this.router,
            this.transportOptions
        );
    }

    public async connectRecvFile(
        fileTransferId: string,
        dtlsParameters: DtlsParameters
    ) {
        return await this.fileTransfer.connectRecvFile(
            fileTransferId,
            dtlsParameters
        );
    }

    public async establishRecvFile(
        fileTransferId: string
    ) {
        return await this.fileTransfer.establishRecvFile(fileTransferId);
    }

    public async createSendFile(fileTransferId: string) {
        return await this.fileTransfer.createSendFile(
            fileTransferId,
            this.router,
            this.transportOptions
        );
    }

    public async connectSendFile(
        fileTransferId: string, 
        dtlsParameters: DtlsParameters
    ) {
        return await this.fileTransfer.connectSendFile(
            fileTransferId, 
            dtlsParameters
        );
    }

    public async establishSendFile(
        fileTransferId: string, 
        produceParameters: ProduceDataParams
    ) {
        return await this.fileTransfer.establishSendFile(
            fileTransferId,
            produceParameters
        );
    }

}