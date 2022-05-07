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

// if this frame is the primary frame, then this is the current world
export let isPrimaryFrame = false;

addShellListener((command, { windowType }) => {
    if (command === "window-type") {
        isPrimaryFrame = windowType === "primary";
    }
});
