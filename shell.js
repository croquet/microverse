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
        this.currentFrame = this.addFrame(location.href, "primary");
        window.history.replaceState({
            portalId: this.currentFrame.portalId,
        }, null, this.currentFrame.src);
        // remove HUD from DOM in shell
        const hud = document.getElementById("hud");
        hud.parentElement.removeChild(hud);
        // TODO: create HUD only when needed?

        window.addEventListener("message", e => {
            if (e.data.message?.startsWith("croquet:microverse:")) {
                for (const [portalId, frame] of this.frames) {
                    if (e.source === frame.contentWindow) {
                        this.receiveFromPortal(portalId, frame, e.data);
                    }
                }
            }
        });

        // user used browser's back/forward buttons
        window.addEventListener("popstate", e => {
            let { portalId } = e.state;
            let frame = this.frames.get(portalId);
            // user may have navigated too far, try to make that work
            if (!frame) for (const [p, f] of this.frames) {
                if (f.src === location.href) {
                    frame = f;
                    portalId = p;
                    break;
                }
            }
            // if we don't have an iframe for this url, we jump there
            // (could also try to load into an iframe but that might give us trouble)
            if (!frame) location.reload();
            // we have an iframe, so we enter it
            if (frame.src === location.href) {
                this.enterPortal(portalId, false);
            } else {
                console.warn(`popstate: location=${document.location}\ndoes not match portal-${portalId} frame.src=${frame.src}`);
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
        frame.style.border = "none";
        frame.style.zIndex = -this.frames.size;
        frame.interval = setInterval(() => {
            // cleared after receiving "croquet:microverse:starting"
            this.sendToPortal(portalId, {message: "croquet:microverse:window-type", windowType});
        }, 50);
        frame.portalId = portalId;
        this.frames.set(portalId, frame);
        document.body.appendChild(frame);
        // console.log("add frame", portalId, url);
        return frame;
    }

    receiveFromPortal(fromPortalId, fromFrame, data) {
        // console.log(`from portal-${fromPortalId}: ${JSON.stringify(data)}`);
        switch (data.message) {
            case "croquet:microverse:starting":
                clearInterval(fromFrame.interval);
                break;
            case "croquet:microverse:load-world":
                if (data.portalId) {
                    const targetFrame = this.frames.get(data.portalId);
                    targetFrame.src = data.url;
                } else {
                    const targetFrame = this.addFrame(data.url);
                    this.sendToPortal(fromPortalId, {message: "croquet:microverse:portal-opened", portalId: targetFrame.portalId, url: data.url});
                }
                break;
            case "croquet:microverse:portal-update":
                this.sendToPortal(data.portalId, {...data, portalId: undefined});
                break;
            case "croquet:microverse:portal-enter":
                if (fromFrame === this.currentFrame) {
                    this.enterPortal(data.portalId, true);
                } else {
                    console.warn("portal-enter from non-current portal-" + fromPortalId);
                }
                break;
        }
    }

    sendToPortal(toPortalId, data) {
        const frame = this.frames.get(toPortalId);
        if (frame) {
            // console.log(`to portal-${toPortalId}: ${JSON.stringify(data)}`);
            frame.contentWindow?.postMessage(data, "*");
        } else {
            console.warn(`portal-${toPortalId} not found`);
        }
    }

    enterPortal(toPortalId, pushState=true) {
        const currentFrame = this.currentFrame;
        const toFrame = this.frames.get(toPortalId);
        currentFrame.style.zIndex = -1;
        toFrame.style.zIndex = 0;
        this.sendToPortal(toPortalId, {message: "croquet:microverse:window-type", windowType: "primary"});
        this.sendToPortal(currentFrame.portalId, {message: "croquet:microverse:window-type", windowType: "secondary"});
        if (pushState) {
            window.history.pushState({
                portalId: toFrame.portalId,
            }, null, toFrame.src);
        }
        this.currentFrame = toFrame;
    }
}
