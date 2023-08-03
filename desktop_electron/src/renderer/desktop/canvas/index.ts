import { KeySims } from './keySim';

export const displayScreen = (
    image: HTMLImageElement,
    img: Buffer
): void => {
    const imgBase64 = btoa(new Uint8Array(img).reduce((data, byte) => data + String.fromCharCode(byte), ''));
    image.src = 'data:image/jpeg;base64,' + imgBase64;
}

export const controlEventListener = (
    canvas: HTMLCanvasElement,
    displayName: string
): void => {
    canvas.addEventListener('mousedown', () => {
        const button = { "button": { "buttonMask": 0x1, "down": true } };
        window.api.testControl(displayName, button);
        //console.log("mousedown: " + JSON.stringify(event));
    }, false);
    canvas.addEventListener('mouseup', () => {
        const button = { "button": { "buttonMask": 0x1, "down": false } };
        window.api.testControl(displayName, button);
        //console.log("mouseup: " + JSON.stringify(event));
    }, false);
    canvas.addEventListener('mousemove', (event) => {
        const mouseX = event.clientX - canvas.getBoundingClientRect().left;
        const mouseY = event.clientY - canvas.getBoundingClientRect().top;;
        const motion = { "move": { "x": Math.round(mouseX), "y": Math.round(mouseY) } };
        window.api.testControl(displayName, motion);
        //console.log("mousemove : x=" + mouseX + ", y=" + mouseY);
    }, false);

    canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const buttonDown = { "button": { "buttonMask": 0x4, "down": true } };
        const buttonUp = { "button": { "buttonMask": 0x4, "down": false } };
        window.api.testControl(displayName, buttonDown);
        window.api.testControl(displayName, buttonUp);
        //console.log(JSON.stringify(event));
    }, false);

    canvas.addEventListener('keydown', (event) => {
        event.preventDefault();
        const keySim = keyboradX11(event);
        if(keySim){
            const key = { "key": {"keySim": keySim, "down": true}};
            window.api.testControl(displayName, key);
        }
        //console.log("keycode down: " + event.key + ' shift:' + event.shiftKey + ' ctrl:' + event.ctrlKey + ' ' + event.keyCode + ' ' + String.fromCharCode(event.keyCode));
    }, false);
    canvas.addEventListener('keyup', (event) => {
        event.preventDefault();
        const keySim = keyboradX11(event);
        if (keySim) {
            const key = { "key": { "keySim": keySim, "down": false } };
            window.api.testControl(displayName, key);
        }
        //console.log("keycode up: " + event.key + ' shift:' + event.shiftKey + ' ctrl:' + event.ctrlKey + ' ' + event.keyCode + ' ' + String.fromCharCode(event.keyCode));
    }, false);

    canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        if (event.deltaY / 100 > 0){
            const button = { "button": { "buttonMask": 0x10, "down": true } };
            window.api.testControl(displayName, button);
        }else {
            const button = { "button": { "buttonMask": 0x8, "down": true } };
            window.api.testControl(displayName, button);
        }
        //console.log("scroll: "+JSON.stringify(data.wheel));
    }, false);
}


const keyboradX11 = (msg: KeyboardEvent): number | undefined => {

    if (msg.key.length == 1 && msg.key.match(/[a-z]/i)) {
        return msg.key.charCodeAt(0);
        //console.log("key: "+ msg.key.toUpperCase());
    }
    else if (msg.key.length == 1 && msg.key.match(/[0-9]/)) { //0~9
        const num = msg.key.match(/[0-9]/);
        const code = num ? num[0] ? num[0].charCodeAt(0) : undefined : undefined;
        return code;
        //console.log("Num: " + JSON.stringify(msg.key));
    } 
    else if (msg.key.match(/^F[1-9]*/)) { //F1~9
        const keys = msg.key.match(/^F[1-9]*/);
        const keySim = keys? KeySims[`${keys[0]}${keys[1]}`] : undefined;
        return keySim;
        //console.log("F: "+JSON.stringify(msg.key));
    } else if (msg.key == 'Control') {
        return KeySims["Control_L"];
    } else if (msg.key == 'Alt') {
        return KeySims["Alt_L"];
    } else if (msg.key == 'Shift') {
        return KeySims["Shift_L"];
    } else if (msg.key == 'Escape') {
        return KeySims["Escape"];
    } else if (msg.key == 'Enter') {
        return KeySims["Return"];
    } else if (msg.key == 'Backspace') {
        return KeySims["BackSpace"];
    } else if (msg.key == 'Tab') {
        return KeySims["Tab"];
    } else if (msg.key == 'Home') {
        return KeySims["Home"];
    } else if (msg.key == 'End') {
        return KeySims["End"];
    } else if (msg.key == 'PageUp') {
        return KeySims["Page_Up"];
    } else if (msg.key == 'PageDown') {
        return KeySims["Page_Down"];
    } else if (msg.key == 'ArrowRight') {
        return KeySims["Right"];
    } else if (msg.key == 'ArrowLeft') {
        return KeySims["Left"];
    } else if (msg.key == 'ArrowUp') {
        return KeySims["Up"];
    } else if (msg.key == 'ArrowDown') {
        return KeySims["Down"];
    } else if (msg.key == 'Insert') {
        return KeySims["Insert"];
    } else if (msg.key == 'Delete') {
        return KeySims["Delete"];
    } else if (msg.key == ' ') {
        return msg.key.charCodeAt(0);
    } else if (msg.key == 'Alphanumeric') {
        return KeySims["Caps_Lock"];
    } else if (msg.key == '[' || msg.keyCode == 219) {
        return msg.key.charCodeAt(0);
    } else if (msg.key == ']' || msg.keyCode == 221) {
        return msg.key.charCodeAt(0);
    } else if (msg.key == '-') {
        return msg.key.charCodeAt(0);
    } else if (msg.key == ',' || msg.keyCode == 188) {
        return msg.key.charCodeAt(0);
    } else if (msg.key == '.' || msg.keyCode == 190) {
        return msg.key.charCodeAt(0);
    }
    //
    else if (msg.key == '/' || msg.keyCode == 191) {
        return msg.key.charCodeAt(0);
    } else if (msg.key == '\\' || msg.keyCode == 220) {
        return msg.key.charCodeAt(0);
    } else if (msg.key == '+') {
        return msg.key.charCodeAt(0);
    } else if (msg.key == '_') {
        return msg.key.charCodeAt(0);
    } else if (msg.key == '=') {
        return msg.key.charCodeAt(0);
    } else if (msg.key == ':') {
        return msg.key.charCodeAt(0);
    } else if (msg.key == '\"') {
        return msg.key.charCodeAt(0);
    } else if (msg.key == '`') {
        return msg.key.charCodeAt(0);
    } else if (msg.key == '~') {
        return msg.key.charCodeAt(0);
    }
    // --- Shift + 0~9 
    else if (msg.key == '!') {
        return msg.key.charCodeAt(0);
    } else if (msg.key == '@') {
        return msg.key.charCodeAt(0);
    } else if (msg.key == '#') {
        return msg.key.charCodeAt(0);
    } else if (msg.key == '$') {
        return msg.key.charCodeAt(0);
    } else if (msg.key == '%') {
        return msg.key.charCodeAt(0);
    } else if (msg.key == '^') {
        return msg.key.charCodeAt(0);
    } else if (msg.key == '&') {
        return msg.key.charCodeAt(0);
    } else if (msg.key == '*') {
        return msg.key.charCodeAt(0);
    } else if (msg.key == '(') {
        return msg.key.charCodeAt(0);
    } else if (msg.key == ')') {
        return msg.key.charCodeAt(0);
    } else if (msg.key.length == 1) {
        const keySim = msg.key.charCodeAt(0);
        return !Number.isNaN(keySim) ? keySim : undefined;
    }

    //console.log(JSON.stringify(keydata));
    return undefined;
}