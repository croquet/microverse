import { App } from "@croquet/worldcore";

let shell;

export function startShell() {
    shell = new Shell();
}

export function isShellFrame() {
    const isOuterFrame = window.self === window.parent;
    if (isOuterFrame) return true;
    const portalId = new URL(location.href).searchParams.get("portal");
    return !portalId;
}

class Shell {
    constructor() {
        const canonicalUrl = shellToCanonicalURL(location.href);
        if (canonicalUrl !== location.href) {
            console.log("redirecting to canonical URL", canonicalUrl);
            location.href = canonicalUrl; // causes reload
        }
        console.log("starting shell");
        this.frames = new Map(); // portalId => frame
        // ensure that we have a session and password
        App.autoSession();
        App.autoPassword();
        this.currentFrame = this.addFrame(App.sessionURL);
        const portalURL = frameToPortalURL(this.currentFrame.src, this.currentFrame.portalId);
        window.history.replaceState({
            portalId: this.currentFrame.portalId,
        }, null, portalURL);
        document.title = portalURL;
        // remove HUD from DOM in shell
        const hud = document.getElementById("hud");
        hud.parentElement.removeChild(hud);
        const shellHud = document.getElementById("shell-hud");
        shellHud.classList.toggle("is-shell", true);
        // TODO: create HUD only when needed?

        window.addEventListener("message", e => {
            if (e.data?.message?.startsWith?.("croquet:microverse:")) {
                for (const [portalId, frame] of this.frames) {
                    if (e.source === frame.contentWindow) {
                        this.receiveFromPortal(portalId, frame, e.data);
                        return;
                    }
                }
                console.warn("shell received message not in portal list", e.data);
                debugger
            }
        });

        // user used browser's back/forward buttons
        window.addEventListener("popstate", e => {
            let { portalId } = e.state;
            let frame = this.frames.get(portalId);
            // user may have navigated too far, try to make that work
            if (!frame) {
                const portalURL = frameToPortalURL(shellToCanonicalURL(location.href));
                for (const [p, f] of this.frames) {
                    if (frameToPortalURL(f.src) === portalURL) {
                        frame = f;
                        portalId = p;
                        break;
                    }
                }
            }
            // if we don't have an iframe for this url, we jump there
            // (could also try to load into an iframe but that might give us trouble)
            if (!frame) location.reload();
            // we have an iframe, so we enter it
            const portalURL = frameToPortalURL(frame.src);
            if (portalURL === shellToCanonicalURL(location.href)) {
                this.enterPortal(portalId, false);
                document.title = portalURL;
            } else {
                console.warn(`popstate: location=${location}\ndoes not match portal-${portalId} frame.src=${frame.src}`);
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

        // joystick sends events into current frame
        this.capturedPointers = {};
        this.joystick = document.getElementById("joystick");
        this.knob = document.getElementById("knob");
        this.releaseHandler = (e) => {
            for (let k in this.capturedPointers) {
                this.hiddenknob.releasePointerCapture(k);
            }
            this.capturedPointers = {};
            this.endMMotion(e);
        };
        this.hiddenknob = document.getElementById("hiddenknob");
        this.hiddenknob.onpointerdown = (e) => {
            if (e.pointerId !== undefined) {
                this.capturedPointers[e.pointerId] = "hiddenKnob";
                this.hiddenknob.setPointerCapture(e.pointerId);
            }
            this.startMMotion(e); // use the knob to start
        };
        //this.hiddenknob.onpointerenter = (e) => console.log("pointerEnter")
        // this.hiddenknob.onpointerleave = (e) => this.releaseHandler(e);
        this.hiddenknob.onpointermove = (e) => this.updateMMotion(e);
        this.hiddenknob.onpointerup = (e) => this.releaseHandler(e);
        this.hiddenknob.onpointercancel = (e) => this.releaseHandler(e);
        this.hiddenknob.onlostpointercapture = (e) => this.releaseHandler(e);

    }

    addFrame(portalURL) {
        let portalId;
        do { portalId = Math.random().toString(36).substring(2, 15); } while (this.frames.has(portalId));
        const frame = document.createElement("iframe");
        frame.src = portalToFrameURL(portalURL, portalId);
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
        // console.log("add frame", portalId, portalURL);
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
            case "croquet:microverse:started":
                // the session was started and player's inWorld flag has been set
                clearInterval(fromFrame.interval);
                fromFrame.interval = null;
                return;
            case "croquet:microverse:portal-load":
                let targetFrame;
                if (data.portalId) {
                    const url = portalToFrameURL(data.portalURL, data.portalId);
                    targetFrame = this.frames.get(data.portalId);
                    if (portalToFrameURL(targetFrame.src, data.portalId) !== url) {
                        // console.log("portal-load", data.portalId, "replacing", targetFrame.src, "with", url);
                        targetFrame.src = url;
                    }
                    return;
                }
                targetFrame = this.findFrame(data.portalURL);
                if (!targetFrame) targetFrame = this.addFrame(data.portalURL);
                this.sendToPortal(fromPortalId, {message: "croquet:microverse:portal-opened", portalId: targetFrame.portalId});
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
                    let targetFrame = this.findFrame(data.portalURL);
                    if (!targetFrame) {
                        console.log("enter-world: no frame for", data.portalURL);
                        targetFrame = this.addFrame(data.portalURL);
                    }
                    this.enterPortal(targetFrame.portalId, true);
                } else {
                    console.warn("enter-world from non-current portal-" + fromPortalId);
                }
                return;
            default:
                console.warn(`shell received unhandled message from portal-${fromPortalId}`, data);
        }
    }

    findFrame(portalURL) {
        // find an existing frame for this portalURL, which may be partial,
        // in particular something loaded from a default spec (e.g. ?world=portal1)
        outer: for (const frame of this.frames.values()) {
            // could be the exact url
            if (frame.src === portalURL) return frame;
            // or just needs to be expanded
            const url = new URL(portalURL, frame.src);
            if (frame.src === url.href) return frame;
            // origin and path must match
            const frameUrl = new URL(frame.src);
            if (frameUrl.origin !== url.origin) continue;
            if (frameUrl.pathname !== url.pathname) continue;
            // all portalURL params must match
            for (const [key, value] of new URLSearchParams(url.search)) {
                if (key === "portal") continue;
                if (frameUrl.searchParams.get(key) !== value) continue outer;
            }
            // as well as all portalURL hash params
            const frameHashParams = new URLSearchParams(frameUrl.hash.slice(1));
            for (const [key, value] of new URLSearchParams(url.hash.slice(1))) {
                if (frameHashParams.get(key) !== value) continue outer;
            }
            // if we get here, we have a match
            return frame;
        }
        return null;
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
            // console.log(`send frame type to portal-${frame.portalId}: ${frameType}`);
        }, 200);
    }

    enterPortal(toPortalId, pushState=true, avatarSpec=null) {
        const fromFrame = this.currentFrame;
        const toFrame = this.frames.get(toPortalId);
        const portalURL = frameToPortalURL(toFrame.src, toPortalId);
        this.sortFrames(toFrame, fromFrame);
        if (pushState) try {
            window.history.pushState({
                portalId: toPortalId,
            }, null, portalURL);
        } catch (e) {
            // probably failed because portalURL has a different origin
            // print error only if same origin
            if (new URL(portalURL, location.href).origin === window.location.origin) {
                console.error(e);
            }
            // we could reload the page but that would be disruptive
            // instead, we stay on the same origin but change the URL
            window.history.pushState({
                portalId: toPortalId,
            }, null, portalToShellURL(portalURL));
        }
        document.title = portalURL;
        this.currentFrame = toFrame;
        this.currentFrame.focus();
        console.log(`shell: sending frame-type to portal-${toPortalId}`, avatarSpec);
        this.sendFrameType(toFrame, avatarSpec);
        console.log(`shell: sending frame-type to portal-${toPortalId}`, {portalURL});
        this.sendFrameType(fromFrame, {portalURL});
        if (this.activeMMotion) {
            const { dx, dy } = this.activeMMotion;
            this.sendToPortal(this.currentFrame.portalId, { message: "croquet:microverse:motion-start", dx, dy });
        }
    }

    // mouse motion via joystick element

    startMMotion(e) {
        e.preventDefault();
        e.stopPropagation();
        this.knobX = e.clientX;
        this.knobY = e.clientY;
        this.activeMMotion = { dx: 0, dy: 0 };
        this.sendToPortal(this.currentFrame.portalId, {message: "croquet:microverse:motion-start"});
    }

    endMMotion(e) {
        e.preventDefault();
        e.stopPropagation();
        this.activeMMotion = null;
        this.hiddenknob.style.transform = "translate(0px, 0px)";
        this.knob.style.transform = "translate(30px, 30px)";
        this.sendToPortal(this.currentFrame.portalId, {message: "croquet:microverse:motion-end"});
    }

    updateMMotion(e) {
        e.preventDefault();
        e.stopPropagation();

        if (this.activeMMotion) {
            let dx = e.clientX - this.knobX;
            let dy = e.clientY - this.knobY;

            this.sendToPortal(this.currentFrame.portalId, {message: "croquet:microverse:motion-update", dx, dy});
            this.activeMMotion.dx = dx;
            this.activeMMotion.dy = dy;

            this.hiddenknob.style.transform = `translate(${dx}px, ${dy}px)`;

            let ds = dx ** 2 + dy ** 2;
            if (ds > 30 * 30) {
                ds = Math.sqrt(ds);
                dx = 30 * dx / ds;
                dy = 30 * dy / ds;
            }

            this.knob.style.transform = `translate(${30 + dx}px, ${30 + dy}px)`;
        }
    }

}

function addParameter(url, key, value) {
    const urlObj = new URL(url, location.href);
    urlObj.searchParams.set(key, value);
    return urlObj.toString();
}

function deleteParameter(url, key) {
    const urlObj = new URL(url, location.href);
    urlObj.searchParams.delete(key);
    return urlObj.toString();
}

// each iframe's src is the portal URL plus `?portal=<portalId>`
// which the shell uses to know if it needs to load a world
// into this frame or if it's the shell frame itself (without `?portal`)

function portalToFrameURL(portalURL, portalId) {
    return addParameter(portalURL, "portal", portalId);
}

function frameToPortalURL(frameURL) {
    return deleteParameter(frameURL, "portal");
}

// we need canonical URLs for navigating between different origins
// the iframe.src can be cross-origin, but the address bar can't
// instead, we add a `?canonical=<base>` parameter to the address bar
// which has the actual current world base URL without any parameters

function portalToShellURL(portalURL) {
    const url = new URL(portalURL, location.href);
    const shellUrl = new URL(location.href);
    // move all search params to the shell URL
    for (const [key, value] of url.searchParams) {
        shellUrl.searchParams.set(key, value);
    }
    url.search = '';
    // move hash params to shell URL
    shellUrl.hash = url.hash;
    url.hash = '';
    // add portal URL to shell URL
    shellUrl.searchParams.set("canonical", url.href);
    return shellUrl.toString();
}

function shellToCanonicalURL(shellURL) {
    const original = new URL(shellURL);
    // if we don't have a canonical URL, we don't have to do anything
    const canonical = original.searchParams.get("canonical");
    if (!canonical) return original.toString();
    original.searchParams.delete("canonical");
    const canonicalUrl = new URL(canonical);
    canonicalUrl.search = original.search;
    canonicalUrl.hash = original.hash;
    return canonicalUrl.toString();
}
