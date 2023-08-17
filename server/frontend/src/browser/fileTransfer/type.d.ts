export type FileUpload = {
    input: HTMLInputElement;
    button: HTMLButtonElement;
}

export type FileDownload = HTMLDivElement;
//NodeListOf<HTMLButtonElement>;

export type FileWatchMsg = {
    msgType: FileMsgType;
    msgItems: string[];
};