let shell;

export function startShell() {
    shell = new Shell();
}

// answer "shell" if this window is the outer shell of the app
// answer "primary", if this window is the top-most iframe showing the current world
// answer "secondary", if this window is another iframe showing a world in a portal
export async function getWindowType() {
    // if we're not running in an iframe this is very fast
    const runningAsFrame = window.self !== window.parent;
    if (!runningAsFrame) return "shell";
    // otherwise, we need to communicate with the parent iframe, which might take a while
    return new Promise(resolve => {
        window.addEventListener("message", e => {
            if (e.source === window.parent) {
                const { message, windowType } = e.data;
                if (message === "croquet:microverse:window-type") {
                    window.parent.postMessage({message: "croquet:microverse:starting"}, "*");
                    // our parent is the shell, so we are not
                    resolve(windowType); // "primary" or "secondary"
                    document.body.style.background = "transparent";
                    document.getElementById("hud").classList.toggle("current-world", windowType === "primary");
                    return;
                }
                // we ignore all other messages here, each portal pawn has its own listener
                // but this listener stays active for the whole lifetime of the app
                // to toggle the HUD
            }
        });
        // after 500 ms we assume the parent iframe is not a shell, so we are
        setTimeout(() => resolve("shell"), 500);
    });
}

class Shell {
    constructor() {
        this.frames = new Map(); // portalId => frame
        this.addFrame(location.href, "primary");
        // remove HUD from DOM in shell
        const hud = document.getElementById("hud");
        hud.parentElement.removeChild(hud);
        // TODO: create HUD only when needed?

        window.addEventListener("message", e => {
            if (e.data.message?.startsWith("croquet:microverse:")) {
                for (const [portalId, frame] of this.frames) {
                    if (e.source === frame.contentWindow) {
                        this.receiveFromFrame(portalId, frame, e.data);
                    }
                }
            }
        });
    }

    addFrame(url, windowType="secondary") {
        let portalId;
        do { portalId = Math.random().toString(36).substring(2, 15); } while (this.frames.has(portalId));
        const frame = document.createElement("iframe");
        frame.src = url;
        frame.style.position = "absolute";
        frame.style.top = "0";
        frame.style.left = "0";
        frame.style.width = "100%";
        frame.style.height = "100%";
        frame.style.zIndex = -this.frames.size;
        frame.interval = setInterval(() => {
            // cleared after receiving "croquet:microverse:starting"
            this.sendToFrame(portalId, {message: "croquet:microverse:window-type", windowType});
        }, 50);
        frame.portalId = portalId;
        this.frames.set(portalId, frame);
        document.body.appendChild(frame);
        return frame;
    }

    receiveFromFrame(fromPortalId, frame, data) {
        // console.log(`from portal-${fromPortalId}: ${JSON.stringify(data)}`);
        switch (data.message) {
            case "croquet:microverse:starting":
                clearInterval(frame.interval);
                break;
            case "croquet:microverse:load-world":
                if (data.portalId) {
                    const targetFrame = this.frames.get(data.portalId);
                    targetFrame.src = data.url;
                } else {
                    const targetFrame = this.addFrame(data.url);
                    this.sendToFrame(fromPortalId, {message: "croquet:microverse:portal-opened", portalId: targetFrame.portalId, url: data.url});
                }
                break;
            case "croquet:microverse:portal-update":
                this.sendToFrame(data.portalId, {...data, portalId: undefined});
                break;
        }
    }

    sendToFrame(toPortalId, data) {
        const frame = this.frames.get(toPortalId);
        if (frame) {
            // console.log(`to portal-${toPortalId}: ${JSON.stringify(data)}`);
            frame.contentWindow?.postMessage(data, "*");
        } else {
            console.warn(`portal-${toPortalId} not found`);
        }
    }
}
