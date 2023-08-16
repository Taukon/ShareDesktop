import * as chokidar from "chokidar";
import { BrowserWindow } from "electron";
import { createReadStream, createWriteStream, statSync } from "fs";
// import * as path from "path";
import { FileMsgType, timer } from "../../util";
import { FileWatchMsg, WriteFileInfo } from "../../util/type";

export class FileWatch {
    private watcher?: chokidar.FSWatcher;
    private path?: string;
    private dir?: string;
    private alreadyRun = false;
    private writeFileList: {[fileName: string]: WriteFileInfo|undefined} = {};

    // TODO
    private checkDirPath(dir: string): string|undefined {
        return `${__dirname}/${dir}`;
    }

    // TODO
    private checkFilePath(fileName: string): string|undefined {
        if(this.path){
            const path = `${this.path}/${fileName}`;
            return path;
        }
        return undefined;
    }

    public getFileInfo(fileName: string): 
    {fileName: string, fileSize: number}|undefined 
    {
        const filePath = this.checkFilePath(fileName);
        if(filePath){
            try{
                const stats = statSync(filePath);
                if(stats.isFile()){
                    const info = {
                        fileName: fileName,
                        fileSize: stats.size,
                    }
                    // console.log(info);
                    return info;
                }
            }catch(error){
                console.log(error);
                return undefined;
            }
        }
        return undefined;
    }

    public async sendStreamFile(
        fileName: string, 
        fileTransferId: string,
        mainWindow: BrowserWindow
    ): Promise<boolean> {
        const filePath = this.checkFilePath(fileName);
        if(filePath){
            // const chunkSize = 16384;
            // const fileReadStream = createReadStream(`./dist/${fileName}`, {highWaterMark: chunkSize});
            const fileReadStream = createReadStream(filePath);
            for await (const chunk of fileReadStream){
                // console.log(chunk.length);
                await timer(10);
                mainWindow.webContents.send('streamSendFileBuffer', {fileTransferId: fileTransferId, buf: chunk});
            }
            return true;
        }
        return false;
    }

    // TODO atomic
    public setFileInfo(fileName: string, fileSize: number): boolean {
        const filePath = this.checkFilePath(fileName);
        if(!this.writeFileList[fileName] && filePath){
            const fileWriteStream = createWriteStream(filePath);
            if(fileSize === 0){
                fileWriteStream.end();
                return false;
            }

            this.writeFileList[fileName] = {
                stream: fileWriteStream,
                size: fileSize,
                receivedSize: 0
            };
            return true;
        }
        
        return false;
    }

    // TODO atomic
    public recvStreamFile(
        fileName: string,
        buffer: Uint8Array
    ): number {
        const writeFileInfo = this.writeFileList[fileName];
        if(writeFileInfo){
            writeFileInfo.receivedSize += buffer.byteLength;
            writeFileInfo.stream.write(buffer);

            if(writeFileInfo.receivedSize === writeFileInfo.size){
                writeFileInfo.stream.end();
                writeFileInfo.stream.destroy();
                delete this.writeFileList[fileName];
                return writeFileInfo.receivedSize;
            }
            return writeFileInfo.receivedSize;
        }
        return 0;
    }

    public destroyRecvStreamFile(
        fileName: string
    ): boolean {
        const writeFileInfo = this.writeFileList[fileName];
        if(writeFileInfo){
            console.log(`cannot recieve file: ${fileName}`);
            writeFileInfo.stream.end();
            writeFileInfo.stream.destroy();
            delete this.writeFileList[fileName];
            return true;
        }
        return false;
    }

    public initFileWatch(dir: string) {
        const path = this.checkDirPath(dir);
        if(path){
            this.dir = dir;
            this.path = path;
            this.watcher = chokidar.watch(
                this.path,
                {
                    ignored:/[\\/\\\\]\./,
                    persistent: true,
                    depth: 0
                }
            );
            this.alreadyRun = true;
            console.log(this.path);
        }     
    }

    public sendFilechange(mainWindow: BrowserWindow): boolean {
        if(this.watcher && this.alreadyRun && this.path){
            this.watchChange(this.watcher, mainWindow, this.path);
            return true;
        }
        return false;
    }

    private watchChange(watcher: chokidar.FSWatcher, mainWindow: BrowserWindow, basePath: string) {
        watcher.on("ready", () => {

            watcher.on("add", (path) => {
                
                const dirPath = path.slice(0, basePath.length);
                if(dirPath === basePath) {
                    const fileName = path.slice(basePath.length + 1);
                    console.log(`added : ${path}`);
                    console.log(fileName);
                    const msg:FileWatchMsg = {
                        msgType: FileMsgType.add,
                        msgItems: [fileName]
                    };
                    mainWindow.webContents.send('streamFileWatchMessage', msg);
                }
            })
            // watcher.on("change", (path) => {
                
            //     const dirPath = path.slice(0, basePath.length);
            //     if(dirPath === this.path) {
            //         const fileName = path.slice(basePath.length + 1);
            //         console.log(`changed : ${path}`)
            //         console.log(fileName);
            //         const msg:FileWatchMsg = {
            //             msgType: FileMsgType.change,
            //             msgItems: [fileName]
            //         };
            //         mainWindow.webContents.send('streamFileWatchMessage', msg);
            //     }
            // })
            watcher.on("unlink", (path) => {
                
                const dirPath = path.slice(0, basePath.length);
                if(dirPath === this.path) {
                    const fileName = path.slice(basePath.length + 1);
                    console.log(`unlink : ${path}`)
                    console.log(fileName);
                    const msg:FileWatchMsg = {
                        msgType: FileMsgType.unlink,
                        msgItems: [fileName]
                    };
                    mainWindow.webContents.send('streamFileWatchMessage', msg);
                }
            })
        });
    }

    public sendFilelist(mainWindow: BrowserWindow): boolean{
        if(this.watcher && this.alreadyRun){
            return this.watchlist(this.watcher, mainWindow);
        }
        return false;
    }

    private watchlist(watcher: chokidar.FSWatcher, mainWindow: BrowserWindow): boolean {
        const paths = watcher.getWatched();
        const pathNmames = Object.keys(paths);
        const targetPath = pathNmames[1];
        const targetDir = paths[pathNmames[0]][0];
        if(targetPath === this.path && targetDir === this.dir){
            const lists = paths[targetPath];
            let sendlists: string[] =[];
            for(const item of lists){
                if(!paths[`${targetPath}/${item}`]){
                    sendlists.push(item);
                }
            }
            console.log(sendlists);
            const msg:FileWatchMsg = {
                msgType: FileMsgType.list,
                msgItems: sendlists
            };
            mainWindow.webContents.send('streamFileWatchMessage', msg);
            return true;
        }
        return false;
    }

    private async close(): Promise<boolean> {
        if(this.watcher && this.alreadyRun){
            await this.watcher.close();
            this.alreadyRun = false;
            return true;
        }
        return false;
    }

    public async changePath(newDir: string): Promise<boolean> {
        const path = this.checkDirPath(newDir);
        if(await this.close() && path){
            this.dir = newDir;
            this.path = path;
            this.watcher = chokidar.watch(
                this.path,
                {
                    ignored:/[\\/\\\\]\./,
                    persistent: true,
                    depth: 0
                }
            );
           this.alreadyRun = true; 
           return true;
        }
        return false;
    }
}