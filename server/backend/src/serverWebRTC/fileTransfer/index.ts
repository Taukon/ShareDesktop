import {
    Router,
    DtlsParameters,
    WebRtcTransportOptions,
} from 'mediasoup/node/lib/types';
import * as crypto from "crypto";
import { createRtcTransport } from '../common';
import { ConsumeDataParams, ProduceDataParams, RtcTransportParams } from './type';
import { FileTransferList, FileTransports } from './manage';

export class FileTransfer {

    private fileTransferList: FileTransferList = {};

    private setFileTransports(fileTransferId: string, fileTransports: FileTransports): boolean {
        // if(this.isFileTransports(fileTransports)){
            this.fileTransferList[fileTransferId] = fileTransports;
            return true;
        // }
        // return false;
    }

    public initFileTransports(fileTransferId: string): boolean {
        const already = this.getFileTransports(fileTransferId);
        if(!already){
            const fileTransports: FileTransports = {
                exits: true
            };
    
            this.fileTransferList[fileTransferId] = fileTransports;
            return true;
        }
        return false;
    }

    private isFileTransports(fileTransports: FileTransports|undefined): fileTransports is FileTransports {
        return typeof fileTransports === 'object' && fileTransports.exits;
    }

    public getFileTransports(fileTransferId: string): FileTransports|undefined {
        const fileTransports = this.fileTransferList[fileTransferId];
        return this.isFileTransports(fileTransports) ? fileTransports : undefined;
    }

    public deleteFileTransports(fileTransferId: string) {
        const fileTransports = this.getFileTransports(fileTransferId);
        const recvTransport = fileTransports?.RecvTransport;
        if(recvTransport){
            console.log("delete RecvFileTransportId: " + recvTransport.id);
            recvTransport.close();
        }

        const sendTransport = fileTransports?.SendTransport;
        if(sendTransport){
            console.log("delete SendFileTransportId: " + sendTransport.id);
            sendTransport.close();
        }

        delete this.fileTransferList[fileTransferId];
        console.log("delete fileTransferList length: " + Object.entries(this.fileTransferList).length);
    }


    // ------------ RecvFile ------------

    public async createRecvFile( 
        fileTransferId: string,
        router: Router,
        transportOptions :WebRtcTransportOptions
    ): Promise<RtcTransportParams|undefined> {
        
        const fileTransports = this.getFileTransports(fileTransferId);

        if(fileTransports?.exits) {
            const { transport, params } = await createRtcTransport(router, transportOptions);
            transport.observer.on('close', () => {
                transport.close();
            });
            fileTransports.RecvTransport = transport;

            this.setFileTransports(fileTransferId, fileTransports);

            return params;
        }


        return undefined;
    }

    public async connectRecvFile(
        fileTransferId: string,
        dtlsParameters: DtlsParameters,
    ):Promise<boolean> {
        const fileTransports = this.getFileTransports(fileTransferId);
        const recvTransport = fileTransports?.RecvTransport;

        if(recvTransport){
            await recvTransport.connect({ dtlsParameters: dtlsParameters });
            return true;
        }
        return false;
    }

    public async establishRecvFile(
        fileTransferId: string,
        FileProducerId: string|undefined
    ): Promise<ConsumeDataParams|undefined> {
        const fileTransports = this.getFileTransports(fileTransferId);
        const recvTransport = fileTransports?.RecvTransport;

        if(recvTransport && FileProducerId){
            const dataConsumer = await recvTransport.consumeData({ dataProducerId: FileProducerId });
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
        transportOptions :WebRtcTransportOptions
    ): Promise<RtcTransportParams|undefined> {
        
        const fileTransports = this.getFileTransports(fileTransferId);

        if(fileTransports?.exits) {
            const { transport, params } = await createRtcTransport(router, transportOptions);
        
            transport.observer.on('close', () => {
                transport.close();
            });

            fileTransports.SendTransport = transport;

            this.setFileTransports(fileTransferId, fileTransports);

            return params;
        }

        return undefined;
    }

    public async connectSendFile(
        fileTransferId: string, 
        dtlsParameters: DtlsParameters
    ):Promise<boolean> {
        const fileTransports = this.getFileTransports(fileTransferId);
        const sendTransport = fileTransports?.SendTransport;

        if(sendTransport) {
            await sendTransport.connect({ dtlsParameters: dtlsParameters });
            return true;
        }
        return false;
    }

    public async establishSendFile(
        fileTransferId: string, 
        produceParameters: ProduceDataParams
    ):Promise<string|undefined> {
        const fileTransports = this.getFileTransports(fileTransferId);
        const sendTransport = fileTransports?.SendTransport;

        if(sendTransport){
            const dataProducer = await sendTransport.produceData(produceParameters);
            //console.log("dataProducer.id: " + dataProducer.id);
            sendTransport.producer = dataProducer;
            return dataProducer.id;
        }
        return undefined;
    }

    public verifyTotal(limitFIleTransfer: number): boolean {
        const total = Object.keys(this.fileTransferList).length
        console.log("Total Client List: " + total);
        if (total + 1 > limitFIleTransfer ) {
            return false;
        }
        return true;
    }

    public getRandomId(): string {
        const S = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      
        return Array.from(crypto.getRandomValues(new Uint32Array(10)))
          .map((v) => S[v % S.length])
          .join('');
      };

}