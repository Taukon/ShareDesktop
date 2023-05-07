import fetch from "node-fetch";
import wrtc from "wrtc";
export const loadWrtc = () => {
    globalThis.RTCPeerConnection = wrtc.RTCPeerConnection;
    globalThis.RTCSessionDescription = wrtc.RTCSessionDescription;
    // @ts-ignore
    global.fetch = fetch;
};
