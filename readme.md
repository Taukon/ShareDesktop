### Install

* Server
```bash
(sudo apt install -y nodejs npm)
sudo apt install -y build-essential python3 python3-pip
```

* Desktop Client
```bash
(sudo apt install -y nodejs npm)
sudo apt install -y build-essential python3 python3-pip
sudo apt install -y libx11-dev libxtst-dev libjpeg-dev xvfb
sudo apt install -y xterm firefox
# for audio
sudo apt install -y ffmpeg pulseaudio

```
---

### Start

* Server
```bash
ShareDesktop$ cd server/backend
ShareDesktop/server/backend$ npm install
ShareDesktop/server/backend$ npm run build

ShareDesktop$ cd server/frontend
ShareDesktop/server/frontend$ npm install
ShareDesktop/server/frontend$ npm run build

ShareDesktop$ cd server/backend
ShareDesktop/server/backend$ npm run start
# without audio
ShareDesktop/server/backend$ npm run start2
```

* Desktop Client
```bash
ShareDesktop$ cd desktop_electron
ShareDesktop/desktop_electron$ npm install
ShareDesktop/desktop_electron$ npm run configure
ShareDesktop/desktop_electron$ npm run build
ShareDesktop/desktop_electron$ npm run prod
ShareDesktop/desktop_electron$ npm run start
```