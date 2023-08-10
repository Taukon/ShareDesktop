export type Callback<T> = (res: T) => void;

export type FileInfo = {
    fileTransferId: string, 
    fileName: string, 
    fileSize: number,
    fileMimeType: string
};