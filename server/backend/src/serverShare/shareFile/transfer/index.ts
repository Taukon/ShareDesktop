import {
  Router,
  DtlsParameters,
  WebRtcTransportOptions,
} from "mediasoup/node/lib/types";
import { createRtcTransport } from "../../common";
import {
  ConsumeDataParams,
  ProduceDataParams,
  RtcTransportParams,
} from "../../common/type";
import {
  FileTransferList,
  FileTransports,
  RecvFileTransport,
  SendFileTransport,
  Transfer,
} from "./manage";

export const transferNode = {
  desktop: "desktop",
  browser: "browser",
};

export class FileTransfer {
  private fileTransferList: FileTransferList = {};

  private setRecvFileTransport(
    fileTransferId: string,
    recvFileTransport: RecvFileTransport,
    nodeType: string,
  ): boolean {
    const transfer = this.fileTransferList[fileTransferId];
    if (this.isTransfer(transfer) && nodeType === transferNode.desktop) {
      transfer.desktop.RecvTransport = recvFileTransport;
      return true;
    } else if (this.isTransfer(transfer) && nodeType === transferNode.browser) {
      transfer.browser.RecvTransport = recvFileTransport;
      return true;
    }

    return false;
  }

  private setSendFileTransport(
    fileTransferId: string,
    sendFileTransport: SendFileTransport,
    nodeType: string,
  ): boolean {
    const transfer = this.fileTransferList[fileTransferId];
    if (this.isTransfer(transfer) && nodeType === transferNode.desktop) {
      transfer.desktop.SendTransport = sendFileTransport;
      return true;
    } else if (this.isTransfer(transfer) && nodeType === transferNode.browser) {
      transfer.browser.SendTransport = sendFileTransport;
      return true;
    }

    return false;
  }

  public initFileTransports(fileTransferId: string): boolean {
    const already = this.fileTransferList[fileTransferId]?.createTime;
    if (!already) {
      const transfer: Transfer = {
        desktop: {},
        browser: {},
        createTime: new Date().toISOString(),
      };
      this.fileTransferList[fileTransferId] = transfer;
      return true;
    }
    return false;
  }

  private isTransfer(transfer: Transfer | undefined): transfer is Transfer {
    return (
      typeof transfer === "object" && typeof transfer.createTime === "string"
    );
  }

  private getFileTransports(
    fileTransferId: string,
    nodeType: string,
  ): FileTransports | undefined {
    const transfer = this.fileTransferList[fileTransferId];
    if (this.isTransfer(transfer) && nodeType === transferNode.desktop) {
      return transfer.desktop;
    } else if (this.isTransfer(transfer) && nodeType === transferNode.browser) {
      return transfer.browser;
    }
    return undefined;
  }

  private getRecvFileTransport(
    fileTransferId: string,
    nodeType: string,
  ): RecvFileTransport | undefined {
    const fileTransports = this.getFileTransports(fileTransferId, nodeType);
    if (fileTransports) {
      return fileTransports.RecvTransport;
    }
    return undefined;
  }

  private getSendFileTransport(
    fileTransferId: string,
    nodeType: string,
  ): SendFileTransport | undefined {
    const fileTransports = this.getFileTransports(fileTransferId, nodeType);
    if (fileTransports) {
      return fileTransports.SendTransport;
    }
    return undefined;
  }

  private closeFileTransports(fileTransports?: FileTransports): void {
    const recvTransport = fileTransports?.RecvTransport;
    if (recvTransport) {
      console.log("delete RecvFileTransportId: " + recvTransport.id);
      recvTransport.close();
    }

    const sendTransport = fileTransports?.SendTransport;
    if (sendTransport) {
      console.log("delete SendFileTransportId: " + sendTransport.id);
      sendTransport.close();
    }
  }

  public deleteTransfer(fileTransferId: string) {
    const transfer = this.fileTransferList[fileTransferId];
    this.closeFileTransports(transfer?.desktop);
    this.closeFileTransports(transfer?.browser);

    delete this.fileTransferList[fileTransferId];
    console.log(
      "delete fileTransferList length: " +
        Object.entries(this.fileTransferList).length,
    );
  }

  // ------------ RecvFile ------------

  public async createRecvFile(
    fileTransferId: string,
    router: Router,
    transportOptions: WebRtcTransportOptions,
    nodeType: string,
  ): Promise<RtcTransportParams | undefined> {
    const fileTransports = this.getFileTransports(fileTransferId, nodeType);
    if (fileTransports) {
      const { transport, params } = await createRtcTransport(
        router,
        transportOptions,
      );
      transport.observer.on("close", () => {
        transport.close();
      });

      this.setRecvFileTransport(fileTransferId, transport, nodeType);

      return params;
    }

    return undefined;
  }

  public async connectRecvFile(
    fileTransferId: string,
    dtlsParameters: DtlsParameters,
    nodeType: string,
  ): Promise<boolean> {
    const recvTransport = this.getRecvFileTransport(fileTransferId, nodeType);

    if (recvTransport) {
      try {
        await recvTransport.connect({ dtlsParameters: dtlsParameters });
        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    }
    return false;
  }

  public async establishRecvFile(
    fileTransferId: string,
    nodeType: string,
  ): Promise<ConsumeDataParams | undefined> {
    let recvTransport: RecvFileTransport | undefined;
    let fileProducerId: string | undefined;
    if (nodeType === transferNode.desktop) {
      recvTransport = this.getRecvFileTransport(
        fileTransferId,
        transferNode.desktop,
      );
      fileProducerId = this.getSendFileTransport(
        fileTransferId,
        transferNode.browser,
      )?.producer?.id;
    } else if (nodeType === transferNode.browser) {
      recvTransport = this.getRecvFileTransport(
        fileTransferId,
        transferNode.browser,
      );
      fileProducerId = this.getSendFileTransport(
        fileTransferId,
        transferNode.desktop,
      )?.producer?.id;
    }

    if (recvTransport && fileProducerId) {
      const dataConsumer = await recvTransport.consumeData({
        dataProducerId: fileProducerId,
      });
      const params = {
        id: dataConsumer.id,
        dataProducerId: dataConsumer.dataProducerId,
        sctpStreamParameters: dataConsumer.sctpStreamParameters,
        label: dataConsumer.label,
        protocol: dataConsumer.protocol,
      };

      recvTransport.consumer = dataConsumer;

      return params;
    }
    return undefined;
  }

  // ------------ SendFile ------------

  public async createSendFile(
    fileTransferId: string,
    router: Router,
    transportOptions: WebRtcTransportOptions,
    nodeType: string,
  ): Promise<RtcTransportParams | undefined> {
    const fileTransports = this.getFileTransports(fileTransferId, nodeType);

    if (fileTransports) {
      const { transport, params } = await createRtcTransport(
        router,
        transportOptions,
      );

      transport.observer.on("close", () => {
        transport.close();
      });

      this.setSendFileTransport(fileTransferId, transport, nodeType);

      return params;
    }

    return undefined;
  }

  public async connectSendFile(
    fileTransferId: string,
    dtlsParameters: DtlsParameters,
    nodeType: string,
  ): Promise<boolean> {
    const sendTransport = this.getSendFileTransport(fileTransferId, nodeType);

    if (sendTransport) {
      try {
        await sendTransport.connect({ dtlsParameters: dtlsParameters });
        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    }
    return false;
  }

  public async establishSendFile(
    fileTransferId: string,
    produceParameters: ProduceDataParams,
    nodeType: string,
  ): Promise<string | undefined> {
    const sendTransport = this.getSendFileTransport(fileTransferId, nodeType);

    if (sendTransport) {
      const dataProducer = await sendTransport.produceData(produceParameters);
      //console.log("dataProducer.id: " + dataProducer.id);
      sendTransport.producer = dataProducer;
      return dataProducer.id;
    }
    return undefined;
  }

  public verifyTotal(limitFileTransfer: number): boolean {
    const total = Object.keys(this.fileTransferList).length;
    console.log("Total Client File List: " + total);
    if (total + 1 > limitFileTransfer) {
      return false;
    }
    return true;
  }
}
