import * as fs from 'fs';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

type Display = {
    width: number;
    height: number;
    depth: number;
};

export class Xvfb {
    private displayName: string;
    private displayNum: number;
    private display: Display = {
        width: 1200,
        height: 720,
        depth: 24
    };
    
    private xvfb_args: string[];
    private process: ChildProcessWithoutNullStreams|undefined;
    private silent: boolean = false;
    private oldDisplay: string|undefined;
    private timeout: number = 50;

    
    constructor(displayNum: number, display: Display){
        this.displayNum = displayNum;
        this.displayName = `:${displayNum}`;
        this.display = display;    
        this.xvfb_args = ['-screen', '0', `${this.display.width}x${this.display.height}x${this.display.depth}`];
    }

    public start(){
        if(!this.process){
            this.setDisplayEnv();
            if(this.checkLockFile()){
                throw new Error('Display ' + this.display + ' is already in use and the "reuse" option is false.');
            }else{
                this.spawnProcess();

                var totalTime = 0;
                while(!this.checkLockFile()){
                    if(totalTime > this.timeout){
                        throw new Error('Could not start Xvfb.');
                    }
                    this.usleep(10000);
                    totalTime += 10;
                }
            }
        }
    }

    public stop(){
        this.killProcess();
        this.restoreDisplayEnv();

        var totalTime = 0;
        while(this.checkLockFile()){
            if(totalTime > this.timeout){
                throw new Error('Could not stop Xvfb.');
            }
            this.usleep(10000);
            totalTime += 10;
        }
    }

    private spawnProcess(){
        this.process = spawn('Xvfb', [ this.displayName ].concat(this.xvfb_args));
        // this.process.stdout.on('data', data => {
        //     if (!this.silent) {
        //         process.stdout.write(data);
        //     }
        // });
        this.process.stderr.on('data', data => {
            if (!this.silent) {
                process.stderr.write(data);
            }
        });
    }

    private setDisplayEnv(){
        this.oldDisplay = process.env.DISPLAY;
        process.env.DISPLAY = this.displayName;
    }

    private restoreDisplayEnv(){
        process.env.DISPLAY = this.oldDisplay;
    }

    private killProcess(){
        if(this.process){
            this.process.kill();
            this.process = undefined;
        }
    }

    private checkLockFile(){
        const lockFilePath = `/tmp/.X${this.displayNum}-lock`;
        return fs.existsSync(lockFilePath);
    }

    private usleep(microsec: number) {
        const stop = Date.now() + microsec / 1000;
        while (Date.now() <= stop);
    };
}
