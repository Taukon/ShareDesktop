import { Socket } from "socket.io-client";
import { Device } from "mediasoup-client";
import { RtpCapabilities } from "mediasoup-client/lib/types";
import {
  setAudio,
  setControl,
  setFileWatch,
  setRecvFile,
  setScreen,
  setSendFile,
} from "./browser";
import {
  initRecvFileTransfer,
  initSendFileTransfer,
  reqConnect,
} from "./signaling";
import { Access, FileInfo } from "./signaling/type";
import { FileDownload, FileUpload } from "./fileShare/type";

export const reqAccess = (
  socket: Socket,
  desktopId: string,
  password: string,
  callback: (socket: Socket, access: Access, rtpCap: RtpCapabilities) => void,
) => {
  reqConnect(socket, { desktopId, password });

  socket.once(
    "resRtpCap",
    async (info: (Access & { rtpCap: RtpCapabilities }) | undefined) => {
      console.log(info);
      if (info) {
        const access: Access = {
          desktopId: info.desktopId,
          token: info.token,
        };
        callback(socket, access, info.rtpCap);
      }
    },
  );
};

export class BrowserWebRTC {
  public desktopId: string;

  public canvas: HTMLCanvasElement;
  public image: HTMLImageElement;
  public audio?: HTMLAudioElement;
  public fileUpload?: FileUpload;
  public fileDownload?: FileDownload;
  private device?: Device;
  private socket?: Socket;
  private access?: Access;

  constructor(
    socket: Socket,
    access: Access,
    rtpCap: RtpCapabilities,
    onAudio: boolean,
  ) {
    this.desktopId = access.desktopId;

    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("tabindex", String(0));

    this.image = new Image();
    this.image.onload = () => {
      this.canvas.width = this.image.width;
      this.canvas.height = this.image.height;
      this.canvas.getContext("2d")?.drawImage(this.image, 0, 0);
    };

    this.loadSetting(socket, access, rtpCap, this.image, this.canvas, onAudio);
  }

  private async loadSetting(
    socket: Socket,
    access: Access,
    rtpCap: RtpCapabilities,
    image: HTMLImageElement,
    canvas: HTMLCanvasElement,
    onAudio: boolean,
  ): Promise<void> {
    const device = new Device();
    await device.load({ routerRtpCapabilities: rtpCap });

    const screenConsumer = await setScreen(device, socket, access, image);
    if (screenConsumer) setControl(device, socket, access, canvas);
    if (onAudio) {
      this.audio = document.createElement("audio");
      this.audio.play();
      setAudio(device, socket, access, this.audio);
    }

    this.device = device;
    this.socket = socket;
    this.access = access;
  }

  public async startFileShare(): Promise<boolean> {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    // input.name = 'files[]'; // 複数ファイル対応のために[]を追加
    const uploadButton = document.createElement("button");
    uploadButton.textContent = "send";

    this.fileUpload = {
      input: fileInput,
      button: uploadButton,
    };
    this.fileDownload = document.createElement("div");

    if (this.device && this.socket && this.access) {
      const result = await this.startFileWatch(
        this.device,
        this.socket,
        this.access,
        this.fileDownload,
      );
      if (result) {
        this.initSendFile(
          this.fileUpload,
          this.device,
          this.socket,
          this.access,
        );
        return true;
      }
    }
    return false;
  }

  private async startFileWatch(
    device: Device,
    socket: Socket,
    access: Access,
    fileDownload: FileDownload,
  ): Promise<boolean> {
    const recvFileFunc = async (fileName: string) => {
      await this.initRecvFile(device, socket, access, fileName);
    };
    const consumer = await setFileWatch(
      device,
      socket,
      access,
      fileDownload,
      recvFileFunc,
    );

    return consumer ? true : false;
  }

  private async initRecvFile(
    device: Device,
    socket: Socket,
    access: Access,
    fileName: string,
  ): Promise<void> {
    const init = initRecvFileTransfer(socket, access, fileName);
    const fileInfo = await init();

    await setRecvFile(device, socket, fileInfo);
  }

  private initSendFile(
    fileUpload: FileUpload,
    device: Device,
    socket: Socket,
    access: Access,
  ) {
    fileUpload.button.addEventListener("click", () => {
      if (fileUpload.input.files) {
        for (let i = 0; i < fileUpload.input.files.length; i++) {
          const fileName = fileUpload.input.files.item(i)?.name;
          const fileSize = fileUpload.input.files.item(i)?.size;
          const fileStream = fileUpload.input.files.item(i)?.stream();
          if (fileName && fileSize && fileStream) {
            // console.log(`file name: ${fileName} | size: ${fileSize}`);
            this.startSendFile(
              device,
              socket,
              access,
              fileName,
              fileSize,
              fileStream,
            );
          }
        }
      } else {
        console.log(`nothing`);
      }
    });
  }

  private async startSendFile(
    device: Device,
    socket: Socket,
    access: Access,
    fileName: string,
    fileSize: number,
    fileStream: ReadableStream<Uint8Array>,
  ): Promise<void> {
    const init = initSendFileTransfer(socket, access);
    const fileTransferId = await init();
    const fileInfo: FileInfo = {
      fileTransferId: fileTransferId,
      fileName: fileName,
      fileSize: fileSize,
    };

    await setSendFile(device, socket, fileInfo, fileStream);
  }
}

// export class BrowserWebRTC {
//   public desktopId: string;

//   public canvas: HTMLCanvasElement;
//   public image: HTMLImageElement;
//   public audio?: HTMLAudioElement;
//   public fileUpload?: FileUpload;
//   public fileDownload?: FileDownload;
//   private device?: mediasoupClient.types.Device;
//   private socket?: Socket;
//   private access?: Access;

//   constructor(
//     desktopId: string,
//     socket: Socket,
//     onAudio: boolean,
//     password: string,
//   ) {
//     this.desktopId = desktopId;

//     this.canvas = document.createElement("canvas");
//     this.canvas.setAttribute("tabindex", String(0));

//     this.image = new Image();
//     this.image.onload = () => {
//       this.canvas.width = this.image.width;
//       this.canvas.height = this.image.height;
//       this.canvas.getContext("2d")?.drawImage(this.image, 0, 0);
//     };
//     //
//     reqConnect(socket, { desktopId, password });
//     this.resConnect(socket, this.image, this.canvas, onAudio);
//   }

//   private resConnect = (
//     socket: Socket,
//     image: HTMLImageElement,
//     canvas: HTMLCanvasElement,
//     onAudio: boolean,
//   ) => {
//     socket.once(
//       "resRtpCap",
//       async (
//         info:
//           | (Access & { rtpCap: mediasoupClient.types.RtpCapabilities })
//           | undefined,
//       ) => {
//         console.log(info);
//         if (info) {
//           const access: Access = {
//             desktopId: info.desktopId,
//             token: info.token,
//           };
//           const device = new mediasoupClient.Device();
//           await device.load({ routerRtpCapabilities: info.rtpCap });

//           const screenConsumer = await setScreen(device, socket, access, image);
//           if (screenConsumer) setControl(device, socket, access, canvas);
//           if (onAudio) {
//             this.audio = document.createElement("audio");
//             this.audio.play();
//             setAudio(device, socket, access, this.audio);
//           }

//           this.device = device;
//           this.socket = socket;
//           this.access = access;
//         }
//       },
//     );
//   };

//   public async startFileShare(): Promise<boolean> {
//     const fileInput = document.createElement("input");
//     fileInput.type = "file";
//     // input.name = 'files[]'; // 複数ファイル対応のために[]を追加
//     const uploadButton = document.createElement("button");
//     uploadButton.textContent = "send";

//     this.fileUpload = {
//       input: fileInput,
//       button: uploadButton,
//     };
//     this.fileDownload = document.createElement("div");

//     if (this.device && this.socket && this.access) {
//       const result = await this.startFileWatch(
//         this.device,
//         this.socket,
//         this.access,
//         this.fileDownload,
//       );
//       if (result) {
//         this.initSendFile(
//           this.fileUpload,
//           this.device,
//           this.socket,
//           this.access,
//         );
//         return true;
//       }
//     }
//     return false;
//   }

//   private async startFileWatch(
//     device: mediasoupClient.types.Device,
//     socket: Socket,
//     access: Access,
//     fileDownload: FileDownload,
//   ): Promise<boolean> {
//     const recvFileFunc = async (fileName: string) => {
//       await this.initRecvFile(device, socket, access, fileName);
//     };
//     const consumer = await setFileWatch(
//       device,
//       socket,
//       access,
//       fileDownload,
//       recvFileFunc,
//     );

//     return consumer ? true : false;
//   }

//   private async initRecvFile(
//     device: mediasoupClient.types.Device,
//     socket: Socket,
//     access: Access,
//     fileName: string,
//   ): Promise<void> {
//     const init = initRecvFileTransfer(socket, access, fileName);
//     const fileInfo = await init();

//     await setRecvFile(device, socket, fileInfo);
//   }

//   private initSendFile(
//     fileUpload: FileUpload,
//     device: mediasoupClient.types.Device,
//     socket: Socket,
//     access: Access,
//   ) {
//     fileUpload.button.addEventListener("click", () => {
//       if (fileUpload.input.files) {
//         for (let i = 0; i < fileUpload.input.files.length; i++) {
//           const fileName = fileUpload.input.files.item(i)?.name;
//           const fileSize = fileUpload.input.files.item(i)?.size;
//           const fileStream = fileUpload.input.files.item(i)?.stream();
//           if (fileName && fileSize && fileStream) {
//             // console.log(`file name: ${fileName} | size: ${fileSize}`);
//             this.startSendFile(
//               device,
//               socket,
//               access,
//               fileName,
//               fileSize,
//               fileStream,
//             );
//           }
//         }
//       } else {
//         console.log(`nothing`);
//       }
//     });
//   }

//   private async startSendFile(
//     device: mediasoupClient.types.Device,
//     socket: Socket,
//     access: Access,
//     fileName: string,
//     fileSize: number,
//     fileStream: ReadableStream<Uint8Array>,
//   ): Promise<void> {
//     const init = initSendFileTransfer(socket, access);
//     const fileTransferId = await init();
//     const fileInfo: FileInfo = {
//       fileTransferId: fileTransferId,
//       fileName: fileName,
//       fileSize: fileSize,
//     };

//     await setSendFile(device, socket, fileInfo, fileStream);
//   }
// }
