import { exec } from "child_process";

let display = 1;

exec(`Xvfb :${display} -screen 0 1280x720x24`);
//Xvfb :1 -screen 0 1280x720x24

exec(`export DISPLAY=:${display} && xterm`);
