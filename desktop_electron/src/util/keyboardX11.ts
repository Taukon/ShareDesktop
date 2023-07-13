type KeySimObject = {
    [prop: string]: number;
};

const KeySims: KeySimObject = {
    "F1": 0xFFBE,
    "F2": 0xFFBF,
    "F3": 0xFFC0,
    "F4": 0xFFC1,
    "F5": 0xFFC2,
    "F6": 0xFFC3,
    "F7": 0xFFC4,
    "F8": 0xFFC5,
    "F9": 0xFFC6,
    "F10": 0xFFC7,
    "F11": 0xFFC8,
    "L1": 0xFFC8,
    "F12": 0xFFC9,
    "L2": 0xFFC9,
    "F13": 0xFFCA,
    "L3": 0xFFCA,
    "F14": 0xFFCB,
    "L4": 0xFFCB,
    "F15": 0xFFCC,
    "L5": 0xFFCC,
    "F16": 0xFFCD,
    "L6": 0xFFCD,
    "F17": 0xFFCE,
    "L7": 0xFFCE,
    "F18": 0xFFCF,
    "L8": 0xFFCF,
    "F19": 0xFFD0,
    "L9": 0xFFD0,
    "F20": 0xFFD1,
    "L10": 0xFFD1,
    "F21": 0xFFD2,
    "R1": 0xFFD2,
    "F22": 0xFFD3,
    "R2": 0xFFD3,
    "F23": 0xFFD4,
    "R3": 0xFFD4,
    "F24": 0xFFD5,
    "R4": 0xFFD5,
    "F25": 0xFFD6,
    "R5": 0xFFD6,
    "F26": 0xFFD7,
    "R6": 0xFFD7,
    "F27": 0xFFD8,
    "R7": 0xFFD8,
    "F28": 0xFFD9,
    "R8": 0xFFD9,
    "F29": 0xFFDA,
    "R9": 0xFFDA,
    "F30": 0xFFDB,
    "R10": 0xFFDB,
    "F31": 0xFFDC,
    "R11": 0xFFDC,
    "F32": 0xFFDD,
    "R12": 0xFFDD,
    "F33": 0xFFDE,
    "R13": 0xFFDE,
    "F34": 0xFFDF,
    "R14": 0xFFDF,
    "F35": 0xFFE0,
    "R15": 0xFFE0,

    "BackSpace": 0xFF08, /* back space, back char */
    "Tab": 0xFF09,
    "Linefeed": 0xFF0A, /* Linefeed, LF */
    "Clear": 0xFF0B,
    "Return": 0xFF0D, /* Return, enter */
    "Pause": 0xFF13, /* Pause, hold */
    "Scroll_Lock": 0xFF14,
    "Sys_Req": 0xFF15,
    "Escape": 0xFF1B,
    "Delete": 0xFFFF, /* Delete, rubout */

    /* Modifiers */

    "Shift_L": 0xFFE1, /* Left shift */
    "Shift_R": 0xFFE2, /* Right shift */
    "Control_L": 0xFFE3, /* Left control */
    "Control_R": 0xFFE4, /* Right control */
    "Caps_Lock": 0xFFE5, /* Caps lock */
    "Shift_Lock": 0xFFE6, /* Shift lock */

    "Meta_L": 0xFFE7, /* Left meta */
    "Meta_R": 0xFFE8, /* Right meta */
    "Alt_L": 0xFFE9, /* Left alt */
    "Alt_R": 0xFFEA, /* Right alt */
    "Super_L": 0xFFEB, /* Left super */
    "Super_R": 0xFFEC, /* Right super */
    "Hyper_L": 0xFFED, /* Left hyper */
    "Hyper_R": 0xFFEE, /* Right hyper */

    /* Cursor control & motion */

    "Home": 0xFF50,
    "Left": 0xFF51, /* Move left, left arrow */
    "Up": 0xFF52, /* Move up, up arrow */
    "Right": 0xFF53, /* Move right, right arrow */
    "Down": 0xFF54, /* Move down, down arrow */
    "Prior": 0xFF55, /* Prior, previous */
    "Page_Up": 0xFF55,
    "Next": 0xFF56, /* Next */
    "Page_Down": 0xFF56,
    "End": 0xFF57, /* EOL */
    "Begin": 0xFF58, /* BOL */


    /* Misc Functions */

    "Select": 0xFF60, /* Select, mark */
    "Print": 0xFF61,
    "Execute": 0xFF62, /* Execute, run, do */
    "Insert": 0xFF63, /* Insert, insert here */
    "Undo": 0xFF65, /* Undo, oops */
    "Redo": 0xFF66, /* redo, again */
    "Menu": 0xFF67,
    "Find": 0xFF68, /* Find, search */
    "Cancel": 0xFF69, /* Cancel, stop, abort, exit */
    "Help": 0xFF6A, /* Help */
    "Break": 0xFF6B,
    "Mode_switch": 0xFF7E, /* Character set switch */
    "script_switch": 0xFF7E,  /* Alias for mode_switch */
    "Num_Lock": 0xFF7F,
};


export const keyboradX11 = (msg: KeyboardEvent): number | undefined => {

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