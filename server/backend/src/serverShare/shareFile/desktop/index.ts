import {
  DtlsParameters,
  Router,
  RtpCapabilities,
  WebRtcTransportOptions,
} from "mediasoup/node/lib/types";
import { DesktopList, DesktopTransports, FileWatchTransport } from "./manage";
import { ProduceDataParams, RtcTransportParams } from "../../common/type";
import { createRtcTransport } from "../../common";

export class FileDesktop {
  private desktopList: DesktopList = {};

  private isDesktopTransports(
    desktopTransports: DesktopTransports | undefined,
  ): desktopTransports is DesktopTransports {
    return (
      typeof desktopTransports === "object" &&
      typeof desktopTransports.createTime === "string"
    );
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

  private setFileWatchTransport(
    desktopId: string,
    fileWatchTransport: FileWatchTransport,
  ): boolean {
    const desktopTransports = this.desktopList[desktopId];
    if (this.isDesktopTransports(desktopTransports)) {
      desktopTransports.fileWatchTransport = fileWatchTransport;
      return true;
    }
    return false;
  }

  private deleteDesktopTransports(
    desktopId: string,
    desktopTransports: DesktopTransports,
  ) {
    const fileWatchTransport = desktopTransports.fileWatchTransport;
    if (fileWatchTransport) {
      console.log("delete Desktop fileWatchTransportId: " + fileWatchTransport.id);
      fileWatchTransport.close();
    }

    delete this.desktopList[desktopId];
    console.log(
      "delete File desktopList length: " +
        Object.entries(this.desktopList).length,
    );
  }

  private initDesktopTransports(desktopId: string): boolean {
    const desktopTransports = this.getDesktopTransports(desktopId);
    if (desktopTransports?.createTime) {
      console.log(`already created File Desktop transports ID: ${desktopId}`);

      this.deleteDesktopTransports(desktopId, desktopTransports);
    }

    const transports: DesktopTransports = {
      createTime: new Date().toISOString(),
    };
    this.desktopList[desktopId] = transports;
    return true;
  }

  public async getRtpCap(
    desktopId: string,
    router: Router,
  ): Promise<RtpCapabilities | undefined> {
    const desktopTransports = this.getDesktopTransports(desktopId);
    if (desktopTransports?.createTime) {
      console.log(`already created Desktop transports ID: ${desktopId}`);

      this.deleteDesktopTransports(desktopId, desktopTransports);
    }

    // initialize DesktopTransports
    if (this.initDesktopTransports(desktopId)) {
      return router.rtpCapabilities;
    }
    return undefined;
  }

  //create ProducerTransport for File Watch
  public async createFileWatch(
    desktopId: string,
    router: Router,
    transportOptions: WebRtcTransportOptions,
  ): Promise<RtcTransportParams | undefined> {
    const createTime = this.getDesktopTransports(desktopId)?.createTime;

    if (createTime) {
      const { transport, params } = await createRtcTransport(
        router,
        transportOptions,
      );


      transport.observer.on("close", () => {
        transport.close();
        //delete this.producerList[transport.id];
      });

      this.setFileWatchTransport(desktopId, transport);

      return params;
    }

    return undefined;
  }

  // connect event of ProducerTransport for File Watch
  public async connectFileWatch(
    desktopId: string,
    dtlsParameters: DtlsParameters,
  ): Promise<boolean> {
    const desktopTransports = this.getDesktopTransports(desktopId);
    const fileWatchTransport = desktopTransports?.fileWatchTransport;

    if (fileWatchTransport) {
      try {
        await fileWatchTransport.connect({ dtlsParameters: dtlsParameters });
        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    }
    return false;
  }

  // produceData event of ProducerTransport for screen
  public async establishFileWatch(
    desktopId: string,
    produceParameters: ProduceDataParams,
  ): Promise<string | undefined> {
    const desktopTransports = this.getDesktopTransports(desktopId);
    const fileWatchTransport = desktopTransports?.fileWatchTransport;

    if (fileWatchTransport) {
      const dataProducer =
        await fileWatchTransport.produceData(produceParameters);
      
      fileWatchTransport.producer = dataProducer;
      return dataProducer.id;
    }
    return undefined;
  }

  public disconnect(desktopId: string): void {
    console.log("disconnect File desktop server id: " + desktopId);

    const desktopTransports = this.getDesktopTransports(desktopId);
    if (desktopTransports?.createTime) {
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

  public getFileWatchProducerId(desktopId: string): string | undefined {
    return this.getDesktopTransports(desktopId)?.fileWatchTransport?.producer
      ?.id;
  }

  public isDesktopId(desktopId: string): boolean {
    return this.getDesktopTransports(desktopId) ? true : false;
  }
}
