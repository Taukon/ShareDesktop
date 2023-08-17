import { FileDownload, FileWatchMsg } from "./type";

export enum FileMsgType {
    list = `list`,
    add = `add`,
    unlink = `unlink`,
    writing = `writing`,
    saved = `saved`
}

export const updateFiles = (
    fileDownload: FileDownload,
    fileWatchMsg: FileWatchMsg,
    recvFileFunc: (fileName: string) => Promise<void>
) => {
    console.log(fileWatchMsg);
    switch(fileWatchMsg.msgType) {
        case FileMsgType.list:
            while(fileDownload.firstChild){
                fileDownload.removeChild(fileDownload.firstChild);
            }
            addFiles(fileDownload, fileWatchMsg.msgItems, recvFileFunc);
            break;
        case FileMsgType.add:
            addFiles(fileDownload, fileWatchMsg.msgItems, recvFileFunc);
            break;
        case FileMsgType.unlink:
            unlinkFiles(fileDownload, fileWatchMsg.msgItems);
            break;
        case FileMsgType.writing:
            unlinkFiles(fileDownload, fileWatchMsg.msgItems);
            break;
        case FileMsgType.saved:
            addFiles(fileDownload, fileWatchMsg.msgItems, recvFileFunc);
            break;
        default:
            break;
    }
}

const addFiles = (
    fileDownload: FileDownload,
    msgItems: string[],
    recvFileFunc: (fileName: string) => Promise<void>
) => {
    for(const item of msgItems){
        const button = document.createElement("button");
        button.textContent = button.id = button.name = item;
        button.addEventListener('click', async () => {
            await recvFileFunc(item);
        });

        fileDownload.appendChild(button);
    }
}

const unlinkFiles = (
    fileDownload: FileDownload,
    msgItems: string[]
) => {
    for(const item of msgItems){
        const fileNodes = fileDownload.childNodes as NodeListOf<HTMLButtonElement>;
        fileNodes.forEach((value, unknown) => {
            if(value.id === item){
                fileDownload.removeChild(value);
            }
        });
    }
}
