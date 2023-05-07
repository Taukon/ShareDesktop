### Install

* Server
```bash
sudo apt-get install -y build-essential nodejs npm python3 python3-pip
```

* Desktop Client
```bash
sudo apt-get install -y build-essential nodejs npm python3 python3-pip
sudo apt-get install -y libx11-dev libxtst-dev libjpeg-dev
sudo apt-get install -y xvfb xterm firefox
# for audio
sudo apt-get install -y ffmpeg pulseaudio

```

* Module
```
ShareDesktop$ install
```

---

### Start

* Server
```bash
ShareDesktop$ cd server/backend
ShareDesktop/server/backend$ npm run build

ShareDesktop$ cd server/frontend
ShareDesktop/server/frontend$ npm run build

ShareDesktop$ cd server/backend
ShareDesktop/server/backend$ npm run start
# without audio
ShareDesktop$ npm run start2
```

* Desktop Client
```bash
ShareDesktop$ cd desktop
ShareDesktop/desktop$ npm run install
ShareDesktop/desktop$ npm run tsc
ShareDesktop/desktop$ npm run start
```