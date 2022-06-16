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
    window.parent.postMessage({ message: PREFIX+command, ...args }, "*");
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
window.addEventListener("message", e => {
    if (e.source === window.parent) {
        const { message }  = e.data;
        if (typeof message === "string" && message.startsWith(PREFIX)) {
            const command = message.slice(PREFIX.length);
            shellListeners.forEach(fn => fn(command, e.data));
        };
    }
});

addShellListener((command, data) => {
    // console.log(`${frameId} received: ${JSON.stringify(data)}`);
    if (command === "frame-type") {
        const primary = data.frameType === "primary";
        if (isPrimaryFrame !== primary) {
            console.log(frameName(), "frame-type", data.frameType);
            isPrimaryFrame = primary;
            document.body.style.background = "transparent";
            document.getElementById("hud").classList.toggle("primary-frame", isPrimaryFrame);
            if (isPrimaryFrame) window.focus();
        }
    }
});
