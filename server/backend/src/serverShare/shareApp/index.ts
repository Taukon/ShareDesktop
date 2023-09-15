import {
  type Router,
  // type RtpCodecCapability,
  type WebRtcTransportOptions,
  // type WorkerSettings,
  type DtlsParameters,
  type RtpCapabilities,
} from "mediasoup/node/lib/types";
import { AppBrowser } from "./browser";
//   import { startWorker } from "../common";
import { type ProduceDataParams } from "../common/type";
import { AppDesktop } from "./desktop";

export class ShareApp {
  private readonly ipAddr: string;
  private router: Router;
  private readonly transportOptions: WebRtcTransportOptions;
  // private readonly workerSettings: WorkerSettings;
  // private readonly mediaCodecs: RtpCodecCapability[];

  private readonly limitBrowser: number;
  private readonly limitDesktop: number;

  private readonly desktop = new AppDesktop();
  private readonly browser = new AppBrowser();

  constructor(
    limitDesktop: number,
    limitBrowser: number,
    router: Router,
    transportOptions: WebRtcTransportOptions,
    //   workerSettings: WorkerSettings,
    //   mediaCodecs: RtpCodecCapability[],
    ipAddr: string,
  ) {
    this.limitBrowser = limitBrowser;
    this.limitDesktop = limitDesktop;
    this.ipAddr = ipAddr;

    this.router = router;
    this.transportOptions = transportOptions;
    //   this.workerSettings = workerSettings;
    //   this.mediaCodecs = mediaCodecs;

    //   startWorker(this.workerSettings, this.mediaCodecs).then((v) => {
    //     this.router = v.router;
    //   });
  }

  private establishControl(browserId: string, desktopId: string): void {
    const dataConsumer = this.browser.getControlDirConsumer(
      browserId,
      desktopId,
    );
    const dataProducer = this.desktop.getControlDirProducer(desktopId);

    if (dataConsumer != null && dataProducer != null) {
      dataConsumer.on("message", (msg) => {
        dataProducer.send(msg);
      });
    }
  }

  public isDesktopId(desktopId: string) {
    return this.desktop.isDesktopId(desktopId);
  }

  // ------------------------ Desktop --------------------------

  public async getRtpCapDesktop(desktopId: string, enableAudio: boolean) {
    return await this.desktop.getRtpCap(desktopId, enableAudio, this.router);
  }

  public async createDesktopControl(desktopId: string) {
    return await this.desktop.createDesktopControl(
      desktopId,
      this.router,
      this.transportOptions,
    );
  }

  public async connectDesktopControl(
    desktopId: string,
    dtlsParameters: DtlsParameters,
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
      this.transportOptions,
    );
  }

  public async connectDesktopScreen(
    desktopId: string,
    dtlsParameters: DtlsParameters,
  ) {
    return await this.desktop.connectDesktopScreen(desktopId, dtlsParameters);
  }

  public async establishDesktopScreen(
    desktopId: string,
    produceParameters: ProduceDataParams,
  ) {
    return await this.desktop.establishDesktopScreen(
      desktopId,
      produceParameters,
    );
  }

  public async createDesktopAudio(desktopId: string, rtcpMux: boolean) {
    return await this.desktop.createDesktopAudio(
      desktopId,
      this.router,
      this.ipAddr,
      rtcpMux,
    );
  }

  public establishDesktopAudio(desktopId: string) {
    return this.desktop.establishDesktopAudio(desktopId);
  }

  public disconnectDesktop(desktopId: string) {
    this.desktop.disconnect(desktopId);
  }

  public verifyTotalDesktop() {
    return this.desktop.verifyTotal(this.limitDesktop);
  }

  // ----------------- Browser ------------------------

  public async getRtpCapBrowser(browserId: string, desktopId: string) {
    return await this.browser.getRtpCap(browserId, desktopId, this.router);
  }

  public async createBrowserControl(browserId: string, desktopId: string) {
    return await this.browser.createBrowserControl(
      browserId,
      desktopId,
      this.router,
      this.transportOptions,
    );
  }

  public async connectBrowserControl(
    browserId: string,
    desktopId: string,
    dtlsParameters: DtlsParameters,
  ) {
    return await this.browser.connectBrowserControl(
      browserId,
      desktopId,
      dtlsParameters,
    );
  }

  public async establishBrowserControl(
    browserId: string,
    desktopId: string,
    produceParameters: ProduceDataParams,
  ) {
    return await this.browser.establishBrowserControl(
      browserId,
      desktopId,
      this.router,
      produceParameters,
      (browserId, desktopId) => {
        this.establishControl(browserId, desktopId);
      },
    );
  }

  public async createBrowserScreenOrAudio(
    browserId: string,
    desktopId: string,
    isAudio: boolean,
  ) {
    return await this.browser.createBrowserScreenOrAudio(
      browserId,
      desktopId,
      isAudio,
      this.router,
      this.transportOptions,
    );
  }

  public async connectBrowserScreenOrAudio(
    browserId: string,
    desktopId: string,
    dtlsParameters: DtlsParameters,
    isAudio: boolean,
  ) {
    return await this.browser.connectBrowserScreenOrAudio(
      browserId,
      desktopId,
      dtlsParameters,
      isAudio,
    );
  }

  public async establishBrowserScreen(browserId: string, desktopId: string) {
    return await this.browser.establishBrowserScreen(
      browserId,
      desktopId,
      this.desktop.getScreenSendProducerId(desktopId),
    );
  }

  public async establishBrowserAudio(
    browserId: string,
    desktopId: string,
    rtpCapabilities: RtpCapabilities,
  ) {
    return await this.browser.establishBrowserAudio(
      browserId,
      desktopId,
      this.desktop.getAudioSendProducerId(desktopId),
      rtpCapabilities,
    );
  }

  public disconnectBrowser(browserId: string) {
    this.browser.disconnect(browserId);
  }

  public verifyTotalBrowser() {
    return this.browser.verifyTotal(this.limitBrowser);
  }
}
