import {
    Router,
    DtlsParameters,
    WebRtcTransportOptions,
} from 'mediasoup/node/lib/types';
import * as crypto from "crypto";
import { createRtcTransport } from '../common';
import { FileTransferList, FileTransports, RecvFileTransport, SendFileTransport } from './manage';
import { 
    ConsumeDataParams, 
    ProduceDataParams, 
    RtcTransportParams 
} from '../common/type';

export class FileTransfer {

    private fileTransferList: FileTransferList = {};

    private setRecvFileTransport(fileTransferId: string, recvFileTransport: RecvFileTransport): boolean {
        const fileTransports = this.fileTransferList[fileTransferId];
        if(this.isFileTransports(fileTransports)){
            fileTransports.RecvTransport = recvFileTransport;
            return true;
        }
        return false;
    }

    private setSendFileTransport(fileTransferId: string, sendFileTransport: SendFileTransport): boolean {
        const fileTransports = this.fileTransferList[fileTransferId];
        if(this.isFileTransports(fileTransports)){
            fileTransports.SendTransport = sendFileTransport;
            return true;
        }
        return false;
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

    private getFileTransports(fileTransferId: string): FileTransports|undefined {
        const fileTransports = this.fileTransferList[fileTransferId];
        return this.isFileTransports(fileTransports) ? fileTransports : undefined;
    }

    private getRecvFileTransport(fileTransferId: string): RecvFileTransport|undefined {
        const fileTransports = this.fileTransferList[fileTransferId];
        if(this.isFileTransports(fileTransports)){
            return fileTransports.RecvTransport;
        }
        return undefined;
    }

    private getSendFileTransport(fileTransferId: string): SendFileTransport|undefined {
        const fileTransports = this.fileTransferList[fileTransferId];
        if(this.isFileTransports(fileTransports)){
            return fileTransports.SendTransport;
        }
        return undefined;
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

            this.setRecvFileTransport(fileTransferId, transport);

            return params;
        }

        return undefined;
    }

    public async connectRecvFile(
        fileTransferId: string,
        dtlsParameters: DtlsParameters,
    ):Promise<boolean> {
        const recvTransport = this.getRecvFileTransport(fileTransferId);

        if(recvTransport){
            try{
                await recvTransport.connect({ dtlsParameters: dtlsParameters });
                return true;
            }catch(error){
                console.log(error);
                return false;
            }
        }
        return false;
    }

    public async establishRecvFile(
        fileTransferId: string
    ): Promise<ConsumeDataParams|undefined> {
        const recvTransport = this.getRecvFileTransport(fileTransferId);
        const fileProducerId = this.getSendFileTransport(fileTransferId)?.producer?.id;

        if(recvTransport && fileProducerId){
            const dataConsumer = await recvTransport.consumeData({ dataProducerId: fileProducerId });
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

            this.setSendFileTransport(fileTransferId, transport);

            return params;
        }

        return undefined;
    }

    public async connectSendFile(
        fileTransferId: string, 
        dtlsParameters: DtlsParameters
    ):Promise<boolean> {
        const sendTransport = this.getSendFileTransport(fileTransferId);

        if(sendTransport) {
            try {
                await sendTransport.connect({ dtlsParameters: dtlsParameters });
                return true;
            }catch(error){
                console.log(error);
                return false;
            }
        }
        return false;
    }

    public async establishSendFile(
        fileTransferId: string, 
        produceParameters: ProduceDataParams
    ):Promise<string|undefined> {
        const sendTransport = this.getSendFileTransport(fileTransferId);

        if(sendTransport){
            const dataProducer = await sendTransport.produceData(produceParameters);
            //console.log("dataProducer.id: " + dataProducer.id);
            sendTransport.producer = dataProducer;
            return dataProducer.id;
        }
        return undefined;
    }

    public verifyTotal(limitFileTransfer: number): boolean {
        const total = Object.keys(this.fileTransferList).length
        console.log("Total Client File List: " + total);
        if (total + 1 > limitFileTransfer ) {
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