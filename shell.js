import { App } from "@croquet/worldcore";

let shell;

export function startShell() {
    shell = new Shell();
}

// answer "shell" if this window is the outer shell of the app
// answer "primary", if this window is the top-most iframe showing the current world
// answer "secondary", if this window is another iframe showing a world in a portal
export function getFrameType() {
    // if we're not running in an iframe this is very fast
    const runningAsFrame = window.self !== window.parent;
    if (!runningAsFrame) return "shell";
    // otherwise, we need to communicate with the parent iframe, which might take a while
    return new Promise(resolve => {
        window.addEventListener("message", e => {
            if (e.source === window.parent) {
                const { message, frameType } = e.data;
                if (message === "croquet:microverse:frame-type") {
                    window.parent.postMessage({message: "croquet:microverse:starting"}, "*");
                    // our parent is the shell, so we are not
                    resolve(frameType); // "primary" or "secondary"
                    document.body.style.background = "transparent";
                    document.getElementById("hud").classList.toggle("current-world", frameType === "primary");
                    if (frameType === "primary") window.focus();
                    return;
                }
                // we ignore all other messages here, each portal pawn has its own listener
                // but this listener stays active for the whole lifetime of the app
                // to toggle the HUD
            }
        });
    });
}

class Shell {
    constructor() {
        this.frames = new Map(); // portalId => frame
        App.autoSession();
        App.autoPassword();
        this.currentFrame = this.addFrame(location.href);
        window.history.replaceState({
            portalId: this.currentFrame.portalId,
        }, null, this.currentFrame.src);
        // remove HUD from DOM in shell
        const hud = document.getElementById("hud");
        hud.parentElement.removeChild(hud);
        const shellHud = document.getElementById("shell-hud");
        shellHud.classList.toggle("is-shell", true);
        // TODO: create HUD only when needed?

        window.addEventListener("message", e => {
            if (e.data?.message?.startsWith("croquet:microverse:")) {
                for (const [portalId, frame] of this.frames) {
                    if (e.source === frame.contentWindow) {
                        this.receiveFromPortal(portalId, frame, e.data);
                        return;
                    }
                }
                console.warn(iframeId, "shell received message not in portal list", e.data);
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

        document.getElementById("fullscreenBttn").onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();

            if (!document.fullscreenElement) {
                // If the document is not in full screen mode
                // make the document full screen
                document.body.requestFullscreen();
            } else {
                // Otherwise exit the full screen
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        }
    }

    addFrame(url) {
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
        frame.style.zIndex = -this.frames.size; // put new frame behind all other frames
        frame.portalId = portalId;
        this.frames.set(portalId, frame);
        document.body.appendChild(frame);
        this.sendFrameType(frame);
        // console.log("add frame", portalId, url);
        return frame;
    }

    sortFrames(mainFrame, portalFrame) {
        // we dont really support more than two frames yet,
        // so for now we just make sure those two frames are on top
        const sorted = [...this.frames.values()].sort((a, b) => {
            if (a === mainFrame) return -1;
            if (b === mainFrame) return 1;
            if (a === portalFrame) return -1;
            if (b === portalFrame) return 1;
            return 0;
        });
        for (let i = 0; i < sorted.length; i++) {
            sorted[i].style.zIndex = -i;
        }
    }

    receiveFromPortal(fromPortalId, fromFrame, data) {
        // console.log(`from portal-${fromPortalId}: ${JSON.stringify(data)}`);
        switch (data.message) {
            case "croquet:microverse:starting":
                // this is the immediate reply to our "croquet:microverse:frame-type" message
                // nothing to do yet until fully started
                return;
            case "croquet:microverse:started":
                // the session was started and player's inWorld flag has been set
                clearInterval(fromFrame.interval);
                fromFrame.interval = null;
                return;
            case "croquet:microverse:load-world":
                const url = new URL(data.url, location.href).href;
                let targetFrame;
                if (data.portalId) {
                    targetFrame = this.frames.get(data.portalId);
                    targetFrame.src = url;
                    return;
                }
                targetFrame = [...this.frames.values()].find(f => f.src === url);
                if (!targetFrame) targetFrame = this.addFrame(url);
                this.sendToPortal(fromPortalId, {message: "croquet:microverse:portal-opened", portalId: targetFrame.portalId, url});
                return;
            case "croquet:microverse:portal-update":
                const toFrame = this.frames.get(data.portalId);
                if (+fromFrame.style.zIndex <= +toFrame.style.zIndex) return; // don't let inner world modify outer world
                this.sendToPortal(data.portalId, {...data, portalId: undefined});
                return;
            case "croquet:microverse:portal-enter":
                if (fromFrame === this.currentFrame) {
                    this.enterPortal(data.portalId, true, data.avatarSpec);
                } else {
                    console.warn("portal-enter from non-current portal-" + fromPortalId);
                }
                return;
            case "croquet:microverse:enter-world":
                if (fromFrame === this.currentFrame) {
                    let targetFrame = [...this.frames.values()].find(f => f.src === data.portalURL);
                    if (!targetFrame) {
                        console.log("enter-world: no frame for", data.portalURL);
                        targetFrame = this.addFrame(url);
                    }
                    this.enterPortal(targetFrame.portalId, true);
                } else {
                    console.warn("enter-world from non-current portal-" + fromPortalId);
                }
                return;
            default:
                console.warn(iframeId, `shell received message from portal-${fromPortalId}`, data);
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

    sendFrameType(frame, spec) {
        if (frame.interval) return;
        frame.interval = setInterval(() => {
            // there are two listeners to this message:
            // 1. the frame itself in shell.js (see below)
            // 2. the avatar in DAvatar.js
            // the avatar only gets constructed after joining the session
            // so we keep sending this message until the avatar is constructed
            // then it will send "croquet:microverse:started" which clears this interval (below)
            const frameType = !this.currentFrame || this.currentFrame === frame ? "primary" : "secondary";
            this.sendToPortal(frame.portalId, {message: "croquet:microverse:frame-type", frameType, spec});
            // console.log(`send window type to portal-${frame.portalId}: ${frameType}`);
        }, 200);
    }

    enterPortal(toPortalId, pushState=true, avatarSpec=null) {
        const fromFrame = this.currentFrame;
        const toFrame = this.frames.get(toPortalId);
        const portalURL = toFrame.src;
        this.sortFrames(toFrame, fromFrame);
        if (pushState) {
            window.history.pushState({
                portalId: toFrame.portalId,
            }, null, portalURL);
        }
        this.currentFrame = toFrame;
        this.currentFrame.focus();
        this.sendFrameType(toFrame, avatarSpec);
        this.sendFrameType(fromFrame, {portalURL});
    }
}
