import {
  type Router,
  type WebRtcTransportOptions,
  type DtlsParameters,
} from "mediasoup/node/lib/types";
import { FileBrowser } from "./browser";
import { type ProduceDataParams } from "../common/type";
import { FileDesktop } from "./desktop";
import { FileTransfer } from "./transfer";
import { getRandomId } from "../../utils";

export class ShareFile {
  private router: Router;
  private readonly transportOptions: WebRtcTransportOptions;

  private readonly limitBrowser: number;
  private readonly limitDesktop: number;
  private readonly limitTransfer: number;

  private readonly desktop = new FileDesktop();
  private readonly browser = new FileBrowser();
  private readonly transfer = new FileTransfer();

  constructor(
    limitDesktop: number,
    limitBrowser: number,
    limitTransfer: number,
    router: Router,
    transportOptions: WebRtcTransportOptions,
  ) {
    this.limitBrowser = limitBrowser;
    this.limitDesktop = limitDesktop;
    this.limitTransfer = limitTransfer;

    this.router = router;
    this.transportOptions = transportOptions;
  }

  public isDesktopId(desktopId: string) {
    return this.desktop.isDesktopId(desktopId);
  }

  public checkTransferId(fileTransferId: string) {
    return this.transfer.checkTransferId(fileTransferId);
  }

  // ------------------------ Desktop --------------------------

  public async getRtpCapDesktop(desktopId: string) {
    return await this.desktop.getRtpCap(desktopId, this.router);
  }

  public async createDesktopFileWatch(desktopId: string) {
    return await this.desktop.createFileWatch(
      desktopId,
      this.router,
      this.transportOptions,
    );
  }

  public async connectDesktopFileWatch(
    desktopId: string,
    dtlsParameters: DtlsParameters,
  ) {
    return await this.desktop.connectFileWatch(desktopId, dtlsParameters);
  }

  public async establishDesktopFileWatch(
    desktopId: string,
    produceParameters: ProduceDataParams,
  ) {
    return await this.desktop.establishFileWatch(desktopId, produceParameters);
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

  public async createBrowserFileWatch(browserId: string, desktopId: string) {
    return await this.browser.createFileWatch(
      browserId,
      desktopId,
      this.router,
      this.transportOptions,
    );
  }

  public async connectBrowserFileWatch(
    browserId: string,
    desktopId: string,
    dtlsParameters: DtlsParameters,
  ) {
    return await this.browser.connectFileWatch(
      browserId,
      desktopId,
      dtlsParameters,
    );
  }

  public async establishBrowserFileWatch(browserId: string, desktopId: string) {
    return await this.browser.establishFileWatch(
      browserId,
      desktopId,
      this.desktop.getFileWatchProducerId(desktopId),
    );
  }

  public disconnectBrowser(browserId: string) {
    this.browser.disconnect(browserId);
  }

  public verifyTotalBrowser() {
    return this.browser.verifyTotal(this.limitBrowser);
  }

  // ------------ File Transfer ---------------

  public initFileTransfer() {
    if (!this.transfer.verifyTotal(this.limitTransfer)) {
      console.log("limit FieTransfer Total");
      return undefined;
    }

    const transferId = getRandomId();
    if (this.transfer.initFileTransports(transferId)) {
      return transferId;
    }
    return undefined;
  }

  public disconnectTransfer(fileTransferId: string) {
    this.transfer.deleteTransfer(fileTransferId);
  }

  public async createRecvFile(fileTransferId: string, nodeType: string) {
    return await this.transfer.createRecvFile(
      fileTransferId,
      this.router,
      this.transportOptions,
      nodeType,
    );
  }

  public async connectRecvFile(
    fileTransferId: string,
    dtlsParameters: DtlsParameters,
    nodeType: string,
  ) {
    return await this.transfer.connectRecvFile(
      fileTransferId,
      dtlsParameters,
      nodeType,
    );
  }

  public async establishRecvFile(fileTransferId: string, nodeType: string) {
    return await this.transfer.establishRecvFile(fileTransferId, nodeType);
  }

  public async createSendFile(fileTransferId: string, nodeType: string) {
    return await this.transfer.createSendFile(
      fileTransferId,
      this.router,
      this.transportOptions,
      nodeType,
    );
  }

  public async connectSendFile(
    fileTransferId: string,
    dtlsParameters: DtlsParameters,
    nodeType: string,
  ) {
    return await this.transfer.connectSendFile(
      fileTransferId,
      dtlsParameters,
      nodeType,
    );
  }

  public async establishSendFile(
    fileTransferId: string,
    produceParameters: ProduceDataParams,
    nodeType: string,
  ) {
    return await this.transfer.establishSendFile(
      fileTransferId,
      produceParameters,
      nodeType,
    );
  }
}
