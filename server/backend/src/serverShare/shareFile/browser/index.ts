import {
  DtlsParameters,
  Router,
  RtpCapabilities,
  WebRtcTransportOptions,
} from "mediasoup/node/lib/types";
import { createRtcTransport } from "../../common";
import { ConsumeDataParams, RtcTransportParams } from "../../common/type";
import {
  BrowserFileList,
  BrowserList,
  BrowserTransports,
  FileWatchTransport,
} from "./manage";

export class FileBrowser {
  private browserIdList: string[] = [];
  private browserList: BrowserList = {};

  private initBrowserFile(browserId: string): void {
    if (this.browserIdList.find((v) => v == browserId) == undefined) {
      this.browserList[browserId] = {
        createTime: new Date().toISOString(),
      } as BrowserFileList;
      this.browserIdList.push(browserId);
    }
  }

  private isBrowserFileList(
    browserFileList: BrowserFileList | undefined,
  ): browserFileList is BrowserFileList {
    return (
      typeof browserFileList === "object" &&
      typeof browserFileList.createTime === "string"
    );
  }

  private isBrowserTransports(
    browserTransports: BrowserTransports | undefined,
  ): browserTransports is BrowserTransports {
    return (
      typeof browserTransports === "object" &&
      typeof browserTransports.createTime === "string"
    );
  }

  private getBrowserTransports(
    browserId: string,
    desktopId: string,
  ): BrowserTransports | undefined {
    const browserFileList = this.browserList[browserId];
    if (this.isBrowserFileList(browserFileList)) {
      const transports = browserFileList[desktopId];

      return this.isBrowserTransports(transports) ? transports : undefined;
    }

    return undefined;
  }

  private setFileWatchTransport(
    browserId: string,
    desktopId: string,
    fileWatchTransport: FileWatchTransport,
  ): boolean {
    const browserFileList = this.browserList[browserId];
    if (this.isBrowserFileList(browserFileList)) {
      const transports = browserFileList[desktopId];
      if (this.isBrowserTransports(transports)) {
        transports.fileWatchTransport = fileWatchTransport;
        return true;
      }
    }
    return false;
  }

  private deleteBrowserTransports(browserTransports: BrowserTransports) {
    const fileWatchTransport = browserTransports.fileWatchTransport;
    if (fileWatchTransport) {
      console.log(
        `delete Browser fileWatchTransportId: ${fileWatchTransport.id}`,
      );
      fileWatchTransport.close();
    }
  }

  private initBrowserTransports(browserId: string, desktopId: string): boolean {
    const browserTransports = this.getBrowserTransports(browserId, desktopId);
    if (browserTransports?.createTime) {
      console.log("already created File browser transports");

      this.deleteBrowserTransports(browserTransports);
    }

    const browserFileList = this.browserList[browserId];
    if (this.isBrowserFileList(browserFileList)) {
      const transports: BrowserTransports = {
        createTime: new Date().toISOString(),
      };
      browserFileList[desktopId] = transports;
      return true;
    } else {
      return false;
    }
  }

  public async getRtpCap(
    browserId: string,
    desktopId: string,
    router: Router,
  ): Promise<RtpCapabilities | undefined> {
    // initialize
    this.initBrowserFile(browserId);

    // initialize Transports
    if (this.initBrowserTransports(browserId, desktopId)) {
      return router.rtpCapabilities;
    }
    return undefined;
  }

  // create ConsumerTransport for FileWatch
  public async createFileWatch(
    browserId: string,
    desktopId: string,
    router: Router,
    transportOptions: WebRtcTransportOptions,
  ): Promise<RtcTransportParams | undefined> {
    const createTime = this.getBrowserTransports(browserId, desktopId)
      ?.createTime;
    const alreadyTransport = this.getBrowserTransports(browserId, desktopId)
      ?.fileWatchTransport;

    if (createTime) {
      if (alreadyTransport) {
        alreadyTransport.close();
      }
      const { transport, params } = await createRtcTransport(
        router,
        transportOptions,
      );
      transport.observer.on("close", () => {
        transport.close();
        //delete this.consumerList[transport.id];
      });

      this.setFileWatchTransport(browserId, desktopId, transport);

      return params;
    }

    return undefined;
  }

  // connect event of ConsumerTransport for FileWatch
  public async connectFileWatch(
    browserId: string,
    desktopId: string,
    dtlsParameters: DtlsParameters,
  ): Promise<boolean> {
    const transports = this.getBrowserTransports(browserId, desktopId);
    const transport = transports?.fileWatchTransport;

    if (transport) {
      try {
        await transport.connect({ dtlsParameters: dtlsParameters });
        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    }
    return false;
  }

  public async establishFileWatch(
    browserId: string,
    desktopId: string,
    watchProducerId: string | undefined,
  ): Promise<ConsumeDataParams | undefined> {
    const clientTransports = this.getBrowserTransports(browserId, desktopId);
    const watchRecvTransport = clientTransports?.fileWatchTransport;

    if (watchRecvTransport && watchProducerId) {
      const dataConsumer = await watchRecvTransport.consumeData({
        dataProducerId: watchProducerId,
      });
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

  public disconnect(browserId: string): void {
    console.log("discconect browser id: " + browserId);

    const browserFileList = this.browserList[browserId];

    if (browserFileList?.createTime) {
      Object.entries(browserFileList).map(([, browserTransports]) => {
        if (typeof browserTransports !== "string") {
          this.deleteBrowserTransports(browserTransports);
        }

        delete this.browserList[browserId];
        const indexId = this.browserIdList.indexOf(browserId);
        this.browserIdList.splice(indexId, 1);

        console.log(
          "delete File clientIdList length: " + this.browserIdList.length,
        );
      });
    }
  }

  public verifyTotal(limitBrowser: number): string | undefined {
    console.log(
      "Total File Client List: " + Object.keys(this.browserList).length,
    );
    if (this.browserIdList.length + 1 > limitBrowser && this.browserIdList[0]) {
      //console.log("clientIdList length: " + clientIdList.length);
      return this.browserIdList[0];
    }
    return undefined;
  }
}
