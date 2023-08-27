import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { existsSync } from "fs";

export class AppProcess {
  private displayName: string;
  private oldDisplay: string | undefined;
  private process: ChildProcessWithoutNullStreams | undefined;
  private silent: boolean = false;
  private command: string;
  private args: string[];

  constructor(displayNum: number, command: string, options: string[]) {
    this.displayName = `:${displayNum}`;
    this.command = command;
    this.args = options;
    if (existsSync(`/tmp/.X${displayNum}-lock`) && !this.process) {
      this.setDisplayEnv();
      this.spawnProcess();
    }
  }

  public isRun(): boolean {
    return this.process ? true : false;
  }

  public stop() {
    this.killProcess();
    this.restoreDisplayEnv();
  }

  private spawnProcess() {
    this.process = spawn(this.command, this.args);
    // this.process.stdout.on('data', data => {
    //     if (!this.silent) {
    //         process.stdout.write(data);
    //     }
    // });

    this.process.stderr.on("data", (data) => {
      if (!this.silent) {
        process.stderr.write(data);
      }
    });
    this.process.on("exit", (code) => {
      if (!this.silent) {
        console.log("App CODE", code);
      }
      this.stop();
    });
    this.process.on("error", (code) => {
      if (!this.silent) {
        console.log("App CODE", code);
      }
      this.stop();
    });
  }

  private killProcess() {
    if (this.process) {
      this.process.kill();
      this.process = undefined;
    }
  }

  private setDisplayEnv() {
    this.oldDisplay = process.env.DISPLAY;
    process.env.DISPLAY = this.displayName;
  }

  private restoreDisplayEnv() {
    process.env.DISPLAY = this.oldDisplay;
  }
}
