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
        this.portalData = new Map(); // portalId => portalData
        // ensure that we have a session and password
        App.autoSession();
        App.autoPassword();
        this.currentFrame = this.addFrame(App.sessionURL);
        const portalURL = frameToPortalURL(this.currentFrame.src, this.currentFrame.portalId);
        window.history.replaceState({
            portalId: this.currentFrame.portalId,
        }, null, portalURL);
        setTitle(portalURL);
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
                this.activateFrame(portalId, false);
                setTitle(portalURL);
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
        this.trackingknob = document.getElementById("trackingknob");

        this.knobStyle = window.getComputedStyle(this.knob);

        window.setTimeout(() => {
            let radius = (parseFloat(this.knobStyle.width) / 2) || 30;
            this.trackingknob.style.transform = "translate(0px, 0px)";
            this.knob.style.transform = `translate(${radius}px, ${radius}px)`;
        }, 1000);

        this.releaseHandler = (e) => {
            for (let k in this.capturedPointers) {
                this.trackingknob.releasePointerCapture(k);
            }
            this.capturedPointers = {};
            this.endMMotion(e);
        };
        this.trackingknob.onpointerdown = (e) => {
            if (e.pointerId !== undefined) {
                this.capturedPointers[e.pointerId] = "hiddenKnob";
                this.trackingknob.setPointerCapture(e.pointerId);
            }
            this.startMMotion(e); // use the knob to start
        };
        //this.trackingknob.onpointerenter = (e) => console.log("pointerEnter")
        // this.trackingknob.onpointerleave = (e) => this.releaseHandler(e);
        this.trackingknob.onpointermove = (e) => this.updateMMotion(e);
        this.trackingknob.onpointerup = (e) => this.releaseHandler(e);
        this.trackingknob.onpointercancel = (e) => this.releaseHandler(e);
        this.trackingknob.onlostpointercapture = (e) => this.releaseHandler(e);

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
        // console.log(`shell received from ${fromPortalId}: ${JSON.stringify(data)}`);
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
                        console.warn("portal-load", data.portalId, "replacing", targetFrame.src, "with", url);
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
                this.sendToPortal(data.portalId, data);
                // remember portalData so we can send them to the portal when it is opened
                this.portalData.set(data.portalId, data);
                return;
            case "croquet:microverse:portal-enter":
                if (fromFrame === this.currentFrame) {
                    this.activateFrame(data.portalId, true, data.avatarSpec);
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
                    this.activateFrame(targetFrame.portalId, true);
                } else {
                    console.warn("enter-world from non-current portal-" + fromPortalId);
                }
                return;
            default:
                console.warn(`shell received unhandled message from portal-${fromPortalId}`, data);
        }
    }

    findFrame(portalURL) {
        portalURL = portalToFrameURL(portalURL, "");
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
                const frameValue = frameUrl.searchParams.get(key);
                // for "portal" and "anchor" params, empty values match
                if ((key === "portal" || key === "anchor") && (!value || !frameValue)) continue;
                // for "debug" param, any value matches
                if (key === "debug") continue;
                // for other params, exact match is required
                if (frameValue !== value) continue outer;
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
            // 1. the frame itself in frame.js
            // 2. the avatar in DAvatar.js
            // the avatar only gets constructed after joining the session
            // so we keep sending this message until the avatar is constructed
            // then it will send "croquet:microverse:started" which clears this interval (below)
            const frameType = !this.currentFrame || this.currentFrame === frame ? "primary" : "secondary";
            this.sendToPortal(frame.portalId, {message: "croquet:microverse:frame-type", frameType, spec});
            // send camera to portal
            if (frameType === "secondary") {
                const data = this.portalData.get(frame.portalId);
                if (data) this.sendToPortal(frame.portalId, data);
            }
            // console.log(`send frame type to portal-${frame.portalId}: ${frameType}`);
        }, 200);
    }

    activateFrame(toPortalId, pushState=true, avatarSpec=null) {
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
        setTitle(portalURL);
        this.currentFrame = toFrame;
        this.currentFrame.focus();
        console.log(`shell: sending frame-type "primary" to portal-${toPortalId}`, avatarSpec);
        this.sendFrameType(toFrame, avatarSpec);
        console.log(`shell: sending frame-type "secondary" to portal-${fromFrame.portalId}`, {portalURL});
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
        let radius = parseFloat(this.knobStyle.width) / 2;
        this.trackingknob.style.transform = "translate(0px, 0px)";
        this.knob.style.transform = `translate(${radius}px, ${radius}px)`;
        this.sendToPortal(this.currentFrame.portalId, {message: "croquet:microverse:motion-end"});
    }

    updateMMotion(e) {
        e.preventDefault();
        e.stopPropagation();

        if (this.activeMMotion) {
            let dx = e.clientX - this.knobX;
            let dy = e.clientY - this.knobY;

            let radius = parseFloat(this.knobStyle.width) / 2;
            let left = parseFloat(this.knobStyle.left) / 2;

            this.sendToPortal(this.currentFrame.portalId, {message: "croquet:microverse:motion-update", dx, dy});
            this.activeMMotion.dx = dx;
            this.activeMMotion.dy = dy;

            this.trackingknob.style.transform = `translate(${dx}px, ${dy}px)`;

            let ds = dx ** 2 + dy ** 2;
            if (ds > (radius + left) ** 2) {
                ds = Math.sqrt(ds);
                dx = (radius + left) * dx / ds;
                dy = (radius + left) * dy / ds;
            }

            this.knob.style.transform = `translate(${radius + dx}px, ${radius + dy}px)`;
        }
    }
}

// each iframe's src is the portal URL plus `?portal=<portalId>`
// which the shell uses to know if it needs to load a world
// into this frame or if it's the shell frame itself (without `?portal`)
// also, we standardize default args of the URL to make it comparable

function portalToFrameURL(portalURL, portalId) {
    const url = new URL(portalURL, location.href);
    // add "portal" parameter
    url.searchParams.set("portal", portalId);
    // remove "world=default"
    const world = url.searchParams.get("world");
    if (world === "default") url.searchParams.delete("world");
    // remove index.html
    const filename = url.pathname.split('/').pop();
    if (filename === "index.html") url.pathname = url.pathname.slice(0, -10);
    // sort params
    const params = [...url.searchParams.entries()].sort((a, b) => {
        // sort "world" first
        if (a[0] === "world") return -1;
        if (b[0] === "world") return 1;
        // sort "portal" last
        if (a[0] === "portal") return 1;
        if (b[0] === "portal") return -1;
        // sort "q" second-to-last
        if (a[0] === "q") return 1;
        if (b[0] === "q") return -1;
        // otherwise sort alphabetically
        return a[0] < b[0] ? -1 : 1;
    });
    url.search = new URLSearchParams(params).toString();
    return url.toString();
}

function frameToPortalURL(frameURL) {
    const url = new URL(frameURL, location.href);
    // delete "portal" parameter
    url.searchParams.delete("portal");
    // remove "world=default"
    const world = url.searchParams.get("world");
    if (world === "default") url.searchParams.delete("world");
    // remove index.html
    const filename = url.pathname.split('/').pop();
    if (filename === "index.html") url.pathname = url.pathname.slice(0, -10);
    // that's it
    return url.toString();
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
    const url = new URL(shellURL);
    const canonical = url.searchParams.get("canonical");
    if (!canonical) return shellURL;
    // replace origin with ?canonical
    url.searchParams.delete("canonical");
    const canonicalUrl = new URL(canonical);
    canonicalUrl.search = url.search;
    canonicalUrl.hash = url.hash;
    return canonicalUrl.toString();
}

// if the URL is on our own domain, strip the domain part,
// otherwise, just the protocol
function setTitle(url) {
    if (url.startsWith(location.origin)) url = url.substr(location.origin.length + 1);
    else url = url.substr(url.indexOf("://") + 3);
    document.title = url;
}