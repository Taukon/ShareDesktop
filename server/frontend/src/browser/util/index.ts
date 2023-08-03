import { Socket } from 'socket.io-client';

export const sendRequest = async (
    socket: Socket,
    type: string, 
    data: any
): Promise<any> => {
    return new Promise((resolve) => {
        socket.emit(type, data, (res: any) => resolve(res));
    });
}
