import {
  DataProducer,
  DtlsParameters,
  Router,
  RtpCapabilities,
  WebRtcTransportOptions,
} from "mediasoup/node/lib/types";
import {
  createDirectProducer,
  createPlainProducer,
  createRtcTransport,
} from "../../common";
import {
  ConsumeDataParams,
  ProduceDataParams,
  RtcTransportParams,
} from "../../common/type";
import {
  AudioDesktopTransport,
  ControlDesktopDirTransport,
  ControlDesktopRtcTransport,
  DesktopList,
  DesktopTransports,
  ScreenDesktopTransport,
} from "./manage";
import { AudioResponse } from "./type";

export class AppDesktop {
  private desktopList: DesktopList = {};

  private isDesktopTransports(
    desktopTransports: DesktopTransports | undefined,
  ): desktopTransports is DesktopTransports {
    return typeof desktopTransports === "object" && desktopTransports.exits;
  }

  private getDesktopTransports(
    desktopId: string,
  ): DesktopTransports | undefined {
    const desktopTransports = this.desktopList[desktopId];
    if (desktopTransports) {
      return this.isDesktopTransports(desktopTransports)
        ? desktopTransports
        : undefined;
    }
    return undefined;
  }

  private setControlTransports(
    desktopId: string,
    controlDesktopRtcTransport: ControlDesktopRtcTransport,
    controlDesktopDirTransport: ControlDesktopDirTransport,
  ): boolean {
    const desktopTransports = this.desktopList[desktopId];
    if (this.isDesktopTransports(desktopTransports)) {
      desktopTransports.controlRtcTransport = controlDesktopRtcTransport;
      desktopTransports.controlDirTransport = controlDesktopDirTransport;
      return true;
    }
    return false;
  }

  private setScreenTransport(
    desktopId: string,
    screenTransport: ScreenDesktopTransport,
  ): boolean {
    const desktopTransports = this.desktopList[desktopId];
    if (this.isDesktopTransports(desktopTransports)) {
      desktopTransports.screenTransport = screenTransport;
      return true;
    }
    return false;
  }

  private setAudioTransport(
    desktopId: string,
    audioTransport: AudioDesktopTransport,
  ): boolean {
    const desktopTransports = this.desktopList[desktopId];
    if (this.isDesktopTransports(desktopTransports)) {
      desktopTransports.audioTransport = audioTransport;
      return true;
    }
    return false;
  }

  private initDesktopTransports(
    desktopId: string,
    enableAudio: boolean,
  ): boolean {
    const desktopTransports = this.getDesktopTransports(desktopId);
    if (desktopTransports?.exits) {
      console.log(`already created Desktop transports ID: ${desktopId}`);

      this.deleteDesktopTransports(desktopId, desktopTransports);
    }

    if (enableAudio) {
      console.log(`enableAudio DesktopID: ${desktopId}`);
    }

    const transports: DesktopTransports = {
      exits: true,
    };
    this.desktopList[desktopId] = transports;
    return true;
  }

  private deleteDesktopTransports(
    desktopId: string,
    desktopTransports: DesktopTransports,
  ) {
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

    const audioTransport = desktopTransports.audioTransport;
    if (audioTransport) {
      console.log("delete audioTransportId: " + audioTransport.id);
      audioTransport.close();
    }

    delete this.desktopList[desktopId];
    console.log(
      "delete desktopList length: " + Object.entries(this.desktopList).length,
    );
  }

  public async getRtpCap(
    desktopId: string,
    enableAudio: boolean,
    router: Router,
  ): Promise<RtpCapabilities | undefined> {
    const desktopTransports = this.getDesktopTransports(desktopId);
    if (desktopTransports?.exits) {
      console.log(`already created Desktop transports ID: ${desktopId}`);

      this.deleteDesktopTransports(desktopId, desktopTransports);
    }

    // initialize DesktopTransports
    if (this.initDesktopTransports(desktopId, enableAudio)) {
      return router.rtpCapabilities;
    }
    return undefined;
  }

  // create ConsumerTransport for control
  public async createDesktopControl(
    desktopId: string,
    router: Router,
    transportOptions: WebRtcTransportOptions,
  ): Promise<RtcTransportParams | undefined> {
    const exits = this.getDesktopTransports(desktopId)?.exits;

    if (exits) {
      const { transport, params } = await createRtcTransport(
        router,
        transportOptions,
      );

      transport.observer.on("close", () => {
        transport.close();
        //delete this.producerList[transport.id];
      });

      const dirTransport = await createDirectProducer(router);
      this.setControlTransports(desktopId, transport, dirTransport);

      return params;
    }
    return undefined;
  }

  // connect event of ConsumerTransport for control
  public async connectDesktopControl(
    desktopId: string,
    dtlsParameters: DtlsParameters,
  ): Promise<boolean> {
    const desktopTransports = this.getDesktopTransports(desktopId);
    const controlRtcTransport = desktopTransports?.controlRtcTransport;

    if (controlRtcTransport) {
      try {
        await controlRtcTransport.connect({ dtlsParameters: dtlsParameters });
        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    }
    return false;
  }

  // consumeData event of ConsumerTransport for control
  public async establishDesktopControl(
    desktopId: string,
  ): Promise<ConsumeDataParams | undefined> {
    const desktopTransports = this.getDesktopTransports(desktopId);
    const controlRtcTransport = desktopTransports?.controlRtcTransport;
    const controlDirProducerId =
      desktopTransports?.controlDirTransport?.producer?.id;

    if (controlRtcTransport && controlDirProducerId) {
      const dataConsumer = await controlRtcTransport.consumeData({
        dataProducerId: controlDirProducerId,
      });
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
  public async createDesktopScreen(
    desktopId: string,
    router: Router,
    transportOptions: WebRtcTransportOptions,
  ): Promise<RtcTransportParams | undefined> {
    const exits = this.getDesktopTransports(desktopId)?.exits;

    if (exits) {
      const { transport, params } = await createRtcTransport(
        router,
        transportOptions,
      );

      transport.observer.on("close", () => {
        transport.close();
        //delete this.producerList[transport.id];
      });

      this.setScreenTransport(desktopId, transport);

      return params;
    }

    return undefined;
  }

  // connect event of ProducerTransport for screen
  public async connectDesktopScreen(
    desktopId: string,
    dtlsParameters: DtlsParameters,
  ): Promise<boolean> {
    const desktopTransports = this.getDesktopTransports(desktopId);
    const screenTransport = desktopTransports?.screenTransport;

    if (screenTransport) {
      try {
        await screenTransport.connect({ dtlsParameters: dtlsParameters });
        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    }
    return false;
  }

  // produceData event of ProducerTransport for screen
  public async establishDesktopScreen(
    desktopId: string,
    produceParameters: ProduceDataParams,
  ): Promise<string | undefined> {
    const desktopTransports = this.getDesktopTransports(desktopId);
    const screenTransport = desktopTransports?.screenTransport;

    if (screenTransport) {
      const dataProducer = await screenTransport.produceData(produceParameters);
      //console.log("dataProducer.id: " + dataProducer.id);
      screenTransport.producer = dataProducer;
      return dataProducer.id;
    }
    return undefined;
  }

  public async createDesktopAudio(
    desktopId: string,
    router: Router,
    ipAddr: string,
    rtcpMux: boolean,
  ): Promise<boolean> {
    const exits = this.getDesktopTransports(desktopId)?.exits;
    if (exits) {
      const audioTransport = await createPlainProducer(router, ipAddr, rtcpMux);
      this.setAudioTransport(desktopId, audioTransport);
      return true;
    }
    return false;
  }

  public establishDesktopAudio(desktopId: string): AudioResponse | undefined {
    const desktopTransports = this.getDesktopTransports(desktopId);
    const audioSendTransport = desktopTransports?.audioTransport;

    // connect audio between transport and serverChannel
    if (audioSendTransport) {
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
        srtpParameters: srtpParameters,
      };

      return msg;
    }
    return undefined;
  }

  public disconnect(desktopId: string): void {
    console.log("disconnect desktop server id: " + desktopId);

    const desktopTransports = this.getDesktopTransports(desktopId);
    if (desktopTransports?.exits) {
      this.deleteDesktopTransports(desktopId, desktopTransports);
    }
  }

  public verifyTotal(limitDesktop: number): string | undefined {
    const desktopIds = Object.keys(this.desktopList);
    console.log("Total Desktop List: " + desktopIds.length);
    if (desktopIds.length + 1 > limitDesktop && desktopIds[0]) {
      //console.log("desktopIds length: " + desktopIds.length);
      return desktopIds[0];
    }
    return undefined;
  }

  public getScreenSendProducerId(desktopId: string): string | undefined {
    return this.getDesktopTransports(desktopId)?.screenTransport?.producer?.id;
  }

  public getAudioSendProducerId(desktopId: string): string | undefined {
    return this.getDesktopTransports(desktopId)?.audioTransport?.producer?.id;
  }

  public getControlDirProducer(desktopId: string): DataProducer | undefined {
    const desktopTransports = this.getDesktopTransports(desktopId);
    return desktopTransports?.controlDirTransport?.producer;
  }

  public isDesktopId(desktopId: string): boolean {
    return this.getDesktopTransports(desktopId) ? true : false;
  }
}
