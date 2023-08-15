import * as chokidar from "chokidar";
import { BrowserWindow } from "electron";
// import * as path from "path";
import { FileWatchMsg } from "../../util/type";

export class FileWatch {
    private watcher?: chokidar.FSWatcher;
    private path?: string;
    private dir?: string;
    private alreadyRun = false;

    public initFileWatch(dir: string) {
        this.dir = dir;
        this.path = `${__dirname}/${dir}`;
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

    public sendFilechange(mainWindow: BrowserWindow): boolean {
        if(this.watcher && this.alreadyRun && this.path){
            this.watchChange(this.watcher, mainWindow, this.path);
            return true;
        }
        return false;
    }

    private watchChange(watcher: chokidar.FSWatcher, mainWindow: BrowserWindow, basePath: string) {
        watcher.on("ready", () => {
            console.log("ready watching ...]")
            watcher.on("add", (path) => {
                
                const dirPath = path.slice(0, basePath.length);
                if(dirPath === basePath) {
                    const fileName = path.slice(basePath.length + 1);
                    console.log(`added : ${path}`);
                    console.log(fileName);
                    const msg:FileWatchMsg = {
                        msgType: `add`,
                        msgItems: [fileName]
                    };
                    mainWindow.webContents.send('streamFileWatchMessage', msg);
                }
            })
            watcher.on("change", (path) => {
                
                const dirPath = path.slice(0, basePath.length);
                if(dirPath === this.path) {
                    const fileName = path.slice(basePath.length + 1);
                    console.log(`changed : ${path}`)
                    console.log(fileName);
                    const msg:FileWatchMsg = {
                        msgType: `change`,
                        msgItems: [fileName]
                    };
                    mainWindow.webContents.send('streamFileWatchMessage', msg);
                }
            })
            watcher.on("unlink", (path) => {
                
                const dirPath = path.slice(0, basePath.length);
                if(dirPath === this.path) {
                    const fileName = path.slice(basePath.length + 1);
                    console.log(`unlink : ${path}`)
                    console.log(fileName);
                    const msg:FileWatchMsg = {
                        msgType: `unlink`,
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
                msgType: `list`,
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
        if(await this.close()){
            this.dir = newDir;
            this.path = `${__dirname}/${newDir}`;
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