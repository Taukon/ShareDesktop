export const timer = (ms: number) => new Promise<void>(
    (resolve) => {
    setTimeout(()=>{
        resolve();
    }, ms);
});