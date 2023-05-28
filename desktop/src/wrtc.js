import fetch from "node-fetch";
import wrtc from "wrtc";
export const loadWrtc = () => {
    global.MediaStream = wrtc.MediaStream;
    global.MediaStreamTrack = wrtc.MediaStreamTrack;
    global.RTCDataChannel = wrtc.RTCDataChannel;
    global.RTCDataChannelEvent = wrtc.RTCDataChannelEvent;
    global.RTCDtlsTransport = wrtc.RTCDtlsTransport;
    global.RTCIceCandidate = wrtc.RTCIceCandidate;
    global.RTCIceTransport = wrtc.RTCIceTransport;
    global.RTCPeerConnection = wrtc.RTCPeerConnection;
    global.RTCPeerConnectionIceEvent = wrtc.RTCPeerConnectionIceEvent;
    global.RTCRtpReceiver = wrtc.RTCRtpReceiver;
    global.RTCRtpSender = wrtc.RTCRtpSender;
    global.RTCRtpTransceiver = wrtc.RTCRtpTransceiver;
    global.RTCSctpTransport = wrtc.RTCSctpTransport;
    global.RTCSessionDescription = wrtc.RTCSessionDescription;
    global.getUserMedia = wrtc.getUserMedia;
    global.mediaDevices = wrtc.mediaDevices;
    global.nonstandard = wrtc.nonstandard;
    // @ts-ignore
    global.fetch = fetch;
};
