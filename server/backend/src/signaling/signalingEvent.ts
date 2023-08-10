import { EventEmitter } from "events";
import { Server } from "socket.io";
import { Callback, FileInfo } from "./type";

export class SignalingEventEmitter {
    private eventEmitter = new EventEmitter();

    public requestDropId(desktopSocketId: string) {
        this.eventEmitter.emit(`dropId`, desktopSocketId);
    }

    public listenDropId(desktopServer: Server) {
        this.eventEmitter.on(
            `dropId`, 
            (
                desktopSocketId: string
            ) => {
                desktopServer.to(desktopSocketId).emit(`end`);
        });
    }

    public requestRecvFile(desktopSocketId: string, fileTransferId: string) {
        this.eventEmitter.once(`${fileTransferId}:ProducerSet`, (fileName: string, fileSize: number) => {
            this.eventEmitter.emit(`requestRecvFile`, desktopSocketId, fileTransferId, fileName, fileSize);
            console.log(`requestRecvFile: ${fileTransferId}`);
        })
    }

    public requestSendFile(desktopSocketId: string, fileTransferId: string) {
        this.eventEmitter.emit(`requestSendFile`, desktopSocketId, fileTransferId);
    }

    public listenRequestFile(desktopServer: Server) {
        this.eventEmitter.on(
            `requestRecvFile`, 
            (
                desktopSocketId: string, 
                fileTransferId: string,
                fileName: string,
                fileSize: number
            ) => {
                desktopServer.to(desktopSocketId).emit(`requestRecvFile`, fileTransferId, fileName, fileSize);
        });

        this.eventEmitter.on(
            `requestSendFile`, 
            (
                desktopSocketId: string, 
                fileTransferId: string
            ) => {
                desktopServer.to(desktopSocketId).emit(`requestSendFile`, fileTransferId);
        });
    }

    public setFileConsumer(fileTransferId: string) {
        this.eventEmitter.emit(`${fileTransferId}:ConsumerSet`);
    }

    public waitFileConsumer(
        fileTransferId: string,
        callback: Callback<string>
    ) {
        this.eventEmitter.once(`${fileTransferId}:ConsumerSet`, () => {
            callback(fileTransferId);
        });
    }

    public setFileProducer(fileTransferId: string, fileName: string, fileSize: number) {
        this.eventEmitter.emit(`${fileTransferId}:ProducerSet`, fileName, fileSize);
    }

    public waitFileProducer(
        fileTransferId: string,
        callback:Callback<FileInfo>
    ) {
        this.eventEmitter.once(`${fileTransferId}:ProducerSet`, (fileName: string, fileSize: number) => {
            callback({fileTransferId: fileTransferId, fileName: fileName, fileSize: fileSize});
        });
    }

}