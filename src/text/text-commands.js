// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// helper

function maybeSelectCommentOrLine(morph) {
  // Dan's famous selection behvior! Here it goes...
  /*   If you click to the right of '//' in the following...
  'wrong' // 'try this'.slice(4)  //should print 'this'
  'http://zork'.slice(7)          //should print 'zork'
  */
  // If click is in comment, just select that part
  var sel = morph.selection,
      {row, column} = sel.lead,
      text = morph.selectionOrLineString();

  if (!sel.isEmpty()) return;

  // text now equals the text of the current line, now look for JS comment
  var idx = text.indexOf('//');
  if (idx === -1                          // Didn't find '//' comment
      || column < idx                 // the click was before the comment
      || (idx>0 && (':"'+"'").indexOf(text[idx-1]) >=0)    // weird cases
      ) { morph.selectLine(row); return }

  // Select and return the text between the comment slashes and end of method
  sel.range = {start: {row, column: idx + 2}, end: {row, column: text.length}};
}

function doEval(morph, range, additionalOpts, code) {
  if (!range)
    range = morph.selection.isEmpty() ? morph.lineRange() : morph.selection.range;
  if (!code)
    code = morph.textInRange(range)
  // eval code here
}


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// commands

let textCommands = {
    "clipboard copy": {
        doc: "placeholder for native copy",
        exec: text => false
    },

    "clipboard cut": {
        doc: "placeholder for native cut",
        exec: text => false
    },

    "clipboard paste": {
        doc: "placeholder for native paste",
        exec: text => false
    },
};

let jsEditorCommands = {
    "doit": {
        doc: "Evaluates the selected code or the current line and report the result",
        exec: async (text, opts, count = 1) => {
            maybeSelectCommentOrLine(text);
            let result, err;
            try {
                opts = Object.assign({}, opts, {inspect: true, inspectDepth: count});
                result = await doEval(text, undefined, opts);
                err = result.isError ? result.value : null;
            } catch (e) { err = e; }
            if (err) console.log('**' + err);
            return result;
        }
    },

    "printit": {
        doc: "Evaluates selected code or the current line and inserts the result in a printed representation",
        exec: async (text, opts) => {
            // opts = {targetModule}
            maybeSelectCommentOrLine(text);
            let result, err;
            try {
                opts = Object.assign({}, opts, {asString: true});
                result = await doEval(text, undefined, opts);
                err = result.isError ? result.value : null;
            } catch (e) { err = e; }
            text.selection.collapseToEnd();
            text.insertTextAndSelect(err ?
                                     String(err) + (err.stack ? "\n" + err.stack : "") :
                                     String(result.value));
            return result;
        }
    },
};

export const defaultCommands = Object.assign({}, textCommands, jsEditorCommands);

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// keybindings

export const defaultKeyBindings = [
  {keys: {mac: 'Meta-C', win: 'Ctrl-C'}, command: "clipboard copy"},
  {keys: {mac: 'Meta-X', win: 'Ctrl-X'}, command: "clipboard cut"},
  {keys: {mac: 'Meta-V', win: 'Ctrl-V'}, command: "clipboard paste"},

  {keys: {mac: 'Meta-Z', win: 'Ctrl-Z'}, command: "text undo"},
  //{keys: {mac: 'Meta-Shift-Z', win: 'Ctrl-Shift-Z'}, command: "text redo"},

  {keys: {mac: 'Meta-D', win:  'Ctrl-D'}, command: "doit"},
  {keys: {mac: 'Meta-P', win: 'Ctrl-P'}, command: "printit"},
  {keys: {mac: 'Meta-S', win: 'Ctrl-S'}, command: "save"},
];

export function lookup(evt, bindings) {
    for (let i = 0; i < bindings.length; i++) {
        let b = bindings[i];
        let keys = b.keys;
        // use bowser for real
        for (let k in keys) {
            if (keys[k] === evt.keyCombo) {
                return b.command;
            }
        }
    }
    return null;
}

let keyMods = [
    [""],
    ["shift"],
    ["alt"],
    ["alt", "shift"],
    ["ctrl"],
    ["ctrl", "shift"],
    ["ctrl", "alt"],
    ["ctrl", "alt", "shift"],
    ["meta"],
    ["meta", "shift"],
    ["meta", "alt"],
    ["meta", "alt", "shift"],
    ["meta", "ctrl"],
    ["meta", "ctrl", "shift"],
    ["meta", "ctrl", "alt"],
    ["meta", "shift", "alt", "shift"]];

let modMap = {"shift": 1,
              "alt":2, "option":2,
              "control":4, "ctrl": 4,
              "super":8,"win":8,"meta":8,"command":8,"cmd":8};

let isNumber = function (key) {
    return /^[0-9]+$/.test(key);
};

function isModifier(key) {
    if (isNumber(key)) return false;
    key = key.replace(/-$/, "").toLowerCase();
    return !!modMap[key];
}

function cap(str) {
    return str[0].toUpperCase() + str.slice(1);
}

function canonicalizeFunctionKey(key) {
    key = key.toLowerCase();
    switch (key) {
    case 'space':
        key = "space";
        break;
    case 'esc':
        key = "escape";
        break;
    case 'return':
        key = "enter";
        break;
    case 'arrowleft':
        key = "left";
        break;
    case 'arrowright':
        key = "right";
        break;
    case 'arrowup':
        key = "up";
        break;
    case 'arrowdown':
        key = "down";
        break;
    default:
        break;
    }

    let function_keys = [
        "backspace", "tab", "enter", "pause", "escape", " ", "pageup", "pagedown", "end", "home", "left", "up", "right", "down", "print", "insert", "delete", "numpad0", "numpad1", "numpad2", "numpad3", "numpad4", "numpad5", "numpad6", "numpad7", "numpad8", "numpad9", "numpadenter", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12", "numlock", "scrolllock"];

    if (function_keys.includes(key)) {
        return cap(key);
    }
    return "";
}

function decodeKeyIdentifier(identifier, keyCode) {
    // trying to find out what the String representation of the key pressed
    // in key event is.
    // Uses keyIdentifier which can be Unicode like "U+0021"

    let id = identifier,
        unicodeDecodeRe = /u\+?([\d\w]{4})/gi,
        unicodeReplacer = (match, grp) => {
            return String.fromCharCode(parseInt(grp, 16));
        },
    key = id && id.replace(unicodeDecodeRe, unicodeReplacer);

    if (key === 'Command' || key === 'Cmd') key = "Meta";
    if (key === ' ') key = "Space";
    if (keyCode === 8 /*KEY_BACKSPACE*/) key = "Backspace";
    return key;
}

function identifyKeyFromCode(evt) {
    let code = evt.code;

    // works on Chrome and Safari
    // https://developer.mozilla.org/en/docs/Web/API/KeyboardEvent/code
    // For certain inputs evt.key or keyCode will return the inserted char, not
    // the key pressed. For keybindings it is nicer to have the actual key,
    // however

    if (typeof code !== "string") return null;

    if (code.startsWith("Key")) return code.slice(3);
    if (code.startsWith("Numpad")) return code;
    if (code.startsWith("Digit")) return code.slice(5);
    if (code.startsWith("Arrow")) return code.slice(5);
    if (code.match(/^F[0-9]{1-2}$/)) return code;

    switch (code) {
    case "Insert":
    case "Home":
    case "PageUp":
    case "PageDown":
        return code;
    case 'Period':
        return ".";
    case 'Comma':
        return ",";
    case 'Help':
        return "Insert";
    case 'Equal':
        return "=";
    case 'Backslash':
    case 'IntlBackslash':
        return "\\";
    case "Minus":
        return "-";
    case "BracketRight":
        return "]";
    case "BracketLeft":
        return "[";
    case "Quote":
        return "'";
    case 'Backquote':
        return "`";
    case 'Semicolon':
        return ";";
    default:
        return null;
    }
}

function eventToKeyCombo(bitMask, onlyModifiers, evt) {
    let key = evt.key,
        keyIdentifier = evt.keyIdentifier;

    let arrows = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    let controls = [10, 13, 8, 46];

    if (arrows.indexOf(evt.key) >= 0) {
        return evt.key;
    }

    if (controls.indexOf(evt.keyCode) >= 0) {
        return evt.key;
    }

    if (bitMask === 0 || bitMask === 1) {return null;}

    // fallback to keyIdentifier for Safari...
    if (!key && keyIdentifier) {
        key = decodeKeyIdentifier(keyIdentifier, evt.which || evt.keyCode);
        evt.key = key = key[evt.shiftKey ? "toUpperCase" : "toLowerCase"]();
        if (isModifier(key)) {return cap(key[0]);}
    }

    let mods = keyMods[bitMask];

    if (evt.code) {
        key = identifyKeyFromCode(evt) || key;
    }

    let keyCombo = mods.map(cap).join('-');
    if (!onlyModifiers) {
        keyCombo += key ? "-" + key : "";
    }
    return keyCombo;
}

export function canonicalizeKeyboardEvent(evt) {
    let bitMask = 0;
    let spec = {
        keyCombo: "",
        key: '',
        shiftKey: false,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        altGraphKey: false,
        isFunctionKey: false,
        isModified: false,
        onlyModifiers: false,
        onlyShiftModifier: null,
        type: evt.type,
        keyCode: evt.keyCode
    };

    Object.keys(modMap).forEach(k => {
        let key = k + "Key";
        if (evt[key]) {
            bitMask |= modMap[k];
            spec[key] = true;
        }
    });

    if (modMap[evt.key.toLowerCase()]) {
        spec.onlyModifiers = true;
    }

    let keyCombo = eventToKeyCombo(bitMask, spec.onlyModifiers, evt);

    if (!keyCombo) {return null;}

    if (bitMask === 0 || bitMask === 1) {
        // 2. Are any modifier keys pressed?
        spec.keyCombo = keyCombo;
        spec.key = evt.key;
        if (bitMask === 1) {
            spec.onlyShiftModifier = true;
            spec.isModified = true;
        }
        return spec;
    }

    if (bitMask > 1) {
        spec.isModified = true;
    }

    if (spec.onlyModifiers) {
        spec.keyCombo = keyCombo;
        spec.key = evt.key;
        spec.onlyModifiers = true;
        return spec;
    }

    // 3. determine the key code and key string of the event.
    let fnKey = canonicalizeFunctionKey(evt.key);
    if (fnKey) {
        spec.isFunctionKey = true;
        spec.key = fnKey;
    } else if (spec.isModified) {
        if (spec.onlyShiftModifier) {
            spec.key = evt.key;
        } else {
            spec.key = evt.key[0].toUpperCase() + evt.key.slice(1);
        }
    } else {
        return null;
        // spec.key = evt.key;
    }

    spec.keyCombo = keyCombo;
    return spec;
}
