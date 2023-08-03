import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

export class AppProcess {
    private displayName: string;
    private oldDisplay: string|undefined;
    private process: ChildProcessWithoutNullStreams|undefined;
    private silent: boolean = false;
    private command: string;
    private options: string[];

    constructor(displayNum: number, command: string, options: string[], callback: ()=>any){
        this.displayName = `:${displayNum}`;
        this.command = command;
        this.options = options;

        this.start(callback);
    }

    public isRun():boolean {
        return this.process ? true : false;
    }

    public stop() {
        this.killProcess();
        this.restoreDisplayEnv();
    }

    private start(callback: ()=>any) {
        if(!this.process){
            this.setDisplayEnv();
            this.spawnProcess(callback);
        }
    }

    private spawnProcess(callback: ()=>any){
        this.process = spawn(this.command, this.options);
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
        this.process.on('exit', (code) => {
            if (!this.silent) {
                console.log('CODE', code);
            }
            this.stop();
            callback();
        });
        this.process.on('error', (code) => {
            if (!this.silent) {
                console.log('CODE', code);
            }
            this.stop();
            callback();
        });
    }

    private killProcess(){
        if(this.process){
            this.process.kill();
            this.process = undefined;
        }
    }

    private setDisplayEnv(){
        this.oldDisplay = process.env.DISPLAY;
        process.env.DISPLAY = this.displayName;
    }

    private restoreDisplayEnv(){
        process.env.DISPLAY = this.oldDisplay;
    }
}