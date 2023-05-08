// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

// if this frame is the primary frame, then this is the current world
export let isPrimaryFrame;

// this is the portalId of the current frame
export const frameId = new URL(window.location.href).searchParams.get("portal");

// this is the world of the current frame
export const worldName = new URL(window.location.href).searchParams.get("world") || "default";

// a name for the frame
export function frameName() {
    return `frame["${worldName}",${frameId}${isPrimaryFrame ? ",primary" : ""}]`;
}

// shared prefix for shell messages
const PREFIX = "croquet:microverse:";

// sending to shell
export function sendToShell(command, args) {
    let dest = window;
    if (!window.standalone) {
        dest = dest.parent;
    }
    dest.postMessage({ message: PREFIX+command, ...args }, "*");
}

// registry of callback functions to receive from shell
const shellListeners = new Set();

export function addShellListener(fn) {
    shellListeners.add(fn);
}

export function removeShellListener(fn) {
    shellListeners.delete(fn);
}

// we register one global event listener for all messages from the shell
// that invokes all callbacks in the registry
// This guaranteees the order in which they will be invoked
window.addEventListener("message", e => {
    if (e.source === window.parent) {
        const { message }  = e.data;
        if (typeof message === "string" && message.startsWith(PREFIX)) {
            const command = message.slice(PREFIX.length);
            shellListeners.forEach(fn => fn(command, e.data));
        };
    }
});

// the first registered listener manages the isPrimaryFrame global
// and toggles CSS etc.
const primaryListener = (command, data) => {
    // console.log(`${frameId} received: ${JSON.stringify(data)}`);
    if (command === "frame-type") {
        const { frameType } = data;
        const primary = frameType === "primary";
        if (isPrimaryFrame !== primary) {
            isPrimaryFrame = primary;
            document.body.style.background = "transparent";
            document.getElementById("hud").classList.toggle("primary-frame", isPrimaryFrame);
            if (isPrimaryFrame) window.focus();
            sendToShell("frame-ready", { frameType });
        }
    }
};

addShellListener(primaryListener);
