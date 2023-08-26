import { existsSync } from "fs";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";

// sudo apt install fcitx-mozc

type Fcitx5Env = {
  DISPLAY: string | undefined;
  GTK_IM_MODULE: string | undefined;
  QT_IM_MODULE: string | undefined;
  XMODIFIERS: string | undefined;
};

export class Fcitx5 {
  private oldEnv: Fcitx5Env;
  private silent: boolean = false;
  public process: ChildProcessWithoutNullStreams | undefined;

  constructor(displayNum: number) {
    this.oldEnv = {
      DISPLAY: process.env.DISPLAY,
      GTK_IM_MODULE: process.env.GTK_IM_MODULE,
      QT_IM_MODULE: process.env.QT_IM_MODULE,
      XMODIFIERS: process.env.XMODIFIERS,
    };
    if (existsSync(`/tmp/.X${displayNum}-lock`)) {
      // TODO
      if (existsSync(`/usr/bin/fcitx5`)) {
        process.env.DISPLAY = `:${displayNum}`;
        this.setEnv();
        this.process = spawn("fcitx5");
        process.env.DISPLAY = this.oldEnv.DISPLAY;

        this.process.on("exit", (code) => {
          if (!this.silent) {
            console.log("CODE", code);
          }
          this.restoreEnv();
        });
        this.process.on("error", (code) => {
          if (!this.silent) {
            console.log("CODE", code);
          }
          this.restoreEnv();
          this.process?.kill();
        });
      }
    }
  }

  private setEnv() {
    process.env.GTK_IM_MODULE = `fcitx`;
    process.env.QT_IM_MODULE = `fcitx`;
    process.env.XMODIFIERS = `@im=fcitx`;
  }

  public restoreEnv() {
    process.env.GTK_IM_MODULE = this.oldEnv.GTK_IM_MODULE;
    process.env.QT_IM_MODULE = this.oldEnv.QT_IM_MODULE;
    process.env.XMODIFIERS = this.oldEnv.XMODIFIERS;
  }
}
