export const timer = (ms: number) => new Promise<void>(
    (resolve) => {
    setTimeout(()=>{
        resolve();
    }, ms);
});

export enum FileMsgType {
    list = `list`,
    add = `add`,
    unlink = `unlink`,
    writing = `writing`,
    saved = `saved`
}