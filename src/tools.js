// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { App } from "@croquet/worldcore-kernel";

// shared prefix for shell messages
const PREFIX = "croquet:microverse:";

let shell;
// no url option => no voice, no settings and use alice avatars
// voiceChat     => voice chat enabled, and show the initial settings
// showSettings  => show the avatar selection but not start voice.
// those parameters are tested with has(), so the value is not significant.

const { searchParams } = new URL(window.location);
const settingsOption = searchParams.has('showSettings');
const voice = searchParams.has('voiceChat'); // add voice chat
const showSettings = voice || settingsOption;
let localConfiguration = (showSettings ? loadLocalStorage() : null) || {};
localConfiguration.voice = voice;
localConfiguration.showSettings = showSettings;

export function startShell() {
    shell = new IFrameShell();
}

class IFrameShell {
    constructor() {
        if (!this.hud) {
            this.hud = document.querySelector("#hud");
            if (!this.hud) {
                let div = document.createElement("div");
                div.innerHTML = `
<div id="hud">
  <div class="container">
    <div class="controllers" style="border:1px solid red">
      <div id="homeBtn" class="btn btn-ui">
        <i class="fas fa-solid fa-house-user no-pointer-events"></i>
      </div>
      <div id="editModeBtn" mobile="false" class="btn">
        <i class="fas fa-solid fa-angle-up no-pointer-events"></i>
      </div>
      <div id="worldMenuBtn" class="btn btn-ui">
        <i class="fa fa-solid fa-bars no-pointer-events"></i>
      </div>
      <input id="ghostSlider" type="range" min="0" max="100">
      </div>
  </div>
  <div id="fullscreenBtn" class="btn btn-ui">
    <i class="fas fa-solid fa-expand"></i>
  </div>
  <div id="joystick">
    <div id="trackingknob"></div>
    <div id="knob"></div>
    <div id="joystick-arrows">
      <div id="joystick-arrow-n" class="joystick-arrow"></div>
      <div id="joystick-arrow-e" class="joystick-arrow"></div>
      <div id="joystick-arrow-w" class="joystick-arrow"></div>
      <div id="joystick-arrow-s" class="joystick-arrow"></div>
    </div>
</div>`.trim();

                this.hud = div.children[0];
                this.fullscreenBtn = this.hud.querySelector("#fullscreenBtn");
                this.fullscreenBtn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();

                    if (e.shiftKey) {
                        document.body.classList.toggle("tilt");
                        return;
                    }

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
                };

                // joystick sends events into primary frame
                this.capturedPointers = {};

                this.joystick = this.hud.querySelector("#joystick");
                this.knob = this.joystick.querySelector("#knob");
                this.trackingKnob = this.joystick.querySelector("#trackingKnob");
            }
        }

        this.adjustJoystickKnob();
        window.onresize = () => this.adjustJoystickKnob();

        if (!document.head.querySelector("#joystick-css")) {
            let css = document.createElement("link");
            css.rel = "stylesheet";
            css.type = "text/css";
            css.id = "joystick-css";
            css.onload = () => {
                this.adjustJoystickKnob();
                if (this._hudFlags) {
                    this.setButtonsVisibility(this._hudFlags);
                    delete this._hudFlags;
                }
            };
            let root = window.microverseDir ? window.microverseDir : "./";
            css.href = root + "assets/css/joystick.css";
            document.head.appendChild(css);
        }

        this.releaseHandler = (e) => {
            for (let k in this.capturedPointers) {
                this.joystick.releasePointerCapture(k);
            }
            this.capturedPointers = {};
            this.endMMotion(e);
        };
        this.joystick.onpointerdown = (e) => {
            if (e.pointerId !== undefined) {
                this.capturedPointers[e.pointerId] = "hiddenKnob";
                this.joystick.setPointerCapture(e.pointerId);
            }
            this.startMMotion(e); // use the knob to start
        };
        //this.joystick.onpointerenter = (e) => console.log("shell: pointerEnter")
        // this.joystick.onpointerleave = (e) => this.releaseHandler(e);
        this.joystick.onpointermove = (e) => this.updateMMotion(e);
        this.joystick.onpointerup = (e) => this.releaseHandler(e);
        this.joystick.onpointercancel = (e) => this.releaseHandler(e);
        this.joystick.onlostpointercapture = (e) => this.releaseHandler(e);
    }

    adjustJoystickKnob() {
        let joystickStyle = window.getComputedStyle(this.joystick);
        let knobStyle = window.getComputedStyle(this.knob);
        let center = (parseFloat(joystickStyle.width) || 120) / 2;
        let size = (parseFloat(knobStyle.width) || 60) / 2;
        let radius = center - size;
        this.joystickLayout = { center, radius };
        this.trackingknob.style.transform = "translate(0px, 0px)"; // top-left
        this.knob.style.transform = `translate(${center-size}px, ${center-size}px)`;
    }

    frameEntry(frameId) {
    }

    frameFromId(frameId) {
    }

    portalId(targetFrame) {
        return null;
    }

    get primaryFrame() { return this.frameFromId(this.primaryFrameId) }

    addFrame(owningFrameId, portalURL) {
    }

    removeFrame(portalId) {
    }

    sortFrames(mainFrame, portalFrame) {
    }

    receiveFromPortal(fromPortalId, fromFrame, cmd, data) {
        // console.log(`shell: received from ${fromPortalId}: ${JSON.stringify(data)}`);
        switch (cmd) {
            case "frame-ready": {
                const expectedFrameType = fromPortalId === this.primaryFrameId ? "primary" : "secondary";
                if (data.frameType !== expectedFrameType) {
                    console.log(`ignoring ${fromPortalId} frame-ready (${data.frameType}) when expecting ${expectedFrameType}`);
                    return;
                }
                const frameEntry = this.frameEntry(fromPortalId);
                if (!frameEntry) return; // somehow gone

                frameEntry.isMicroverse = true;
                break;
            }
            case "avatar-ready": {
                // the avatar has been created; player's inWorld flag has been set;
                // the frame has frozen rendering.
                // however, there is a chance that the primary/secondary status of the
                // frame has changed since the frame-type message was dispatched.  if that
                // has happened, we ignore this response; frame-type will be sent again.
                const expectedFrameType = fromPortalId === this.primaryFrameId ? "primary" : "secondary";
                if (data.frameType !== expectedFrameType) {
                    console.log(`ignoring ${fromPortalId} avatar-ready (${data.frameType}) when expecting ${expectedFrameType}`);
                    return;
                }
                const frameEntry = this.frameEntry(fromPortalId);
                if (!frameEntry) return; // somehow gone

                frameEntry.isMicroverse = true; // but ought to be true already
                clearInterval(frameEntry.frameTypeInterval);
                frameEntry.frameTypeInterval = null;
                // as part of activating a new primary, we wait until all frames are
                // frozen (which sending this message also implies).
                // once all are ready, we send release-freeze to the primary.
                // it will then (re)start rendering.
                if (this.awaitedFrameTypes[fromPortalId]) {
                    delete this.awaitedFrameTypes[fromPortalId];
                    if (Object.keys(this.awaitedFrameTypes).length === 0) {
                        this.sendToPortal(this.primaryFrameId, "release-freeze");
                    }
                }
                return;
            }
            case "portal-open":
                return;
            case "portal-close":
                return;
            case "portal-update":
                return;
            case "portal-world-rendered":
                return;
            case "primary-rendered":
                return;
            case "portal-enter":
                return;
            case "world-enter":
                return;
            case "world-replace":
                return;
            case "hud":
                this.setButtonsVisibility(data);
                return;
            case "send-configuration":
                // console.log("sending config", localConfiguration);
                this.sendToPortal(fromPortalId, "local-configuration", { localConfig: localConfiguration });
                return;
            case "update-configuration":
                console.log("updated config", data.localConfig);
                localConfiguration = data.localConfig;
                localConfiguration.userHasSet = true;
                saveLocalStorage(data.localConfig);
                return;
            default:
                console.warn(`shell: received unknown command "${cmd}" from portal-${fromPortalId}`, data);
        }
    }

    setButtonsVisibility(data) {
        let joystickFlag = data.joystick;
        let fullscreenFlag = data.fullscreen;
        if (!document.head.querySelector("#joystick-css")) {
            this._hudFlags = {joystick: data.joystick, fullscreen: data.fullscreen};
        }
        // work around pointer capture bug on Quest
        if (navigator.userAgent.indexOf("OculusBrowser") !== -1) {
            joystickFlag = false;
            fullscreenFlag = false;
        }
        if (joystickFlag !== undefined && this.joystick) {
            if (joystickFlag) {
                this.joystick.style.removeProperty("display");
            } else {
                this.joystick.style.setProperty("display", "none");
            }
        }
        if (fullscreenFlag !== undefined && this.fullscreenBtn) {
            if (fullscreenFlag) {
                this.fullscreenBtn.style.removeProperty("display");
            } else {
                this.fullscreenBtn.style.setProperty("display", "none");
            }
        }
    }

    sendToPortal(toPortalId, cmd, data = {}) {
        const frame = window;
        data.message = `${PREFIX}${cmd}`;
        // console.log(`shell: to portal-${toPortalId}: ${JSON.stringify(data)}`);
        frame.contentWindow?.postMessage(data, "*");
    }

    sendFrameType(frameId, spec = null) {
        const frameType = "primary";
        const frameEntry = this.frameEntry(frameId);
        frameEntry.frameTypeArgs = { frameType, spec };
        if (frameEntry.frameTypeInterval) return; // we're already polling.  latest args will be used.

        const pollingStart = Date.now();
        frameEntry.frameTypeInterval = setInterval(() => {
            if (!this.frameEntry(frameId)) {
                console.log(`shell: abandoning "frame-type" send for removed portal-${frameId}`);
                clearInterval(frameEntry.frameTypeInterval);
                return;
            }
            // under normal circs the frame will respond within 100ms.  we give it a
            // super-generous 20s (because 2s turned out not to be enough, in some browser
            // situations) before deciding that this really really isn't looking like a
            // microverse frame.
            if (Date.now() - pollingStart > 20000 && !frameEntry.isMicroverse) {
                console.log(`shell: abandoning "frame-type" send for timed-out portal-${frameId}`);
                clearInterval(frameEntry.frameTypeInterval);
                return;
            }

            // there are three listeners to the frame-type message:
            //   1. the frame itself (frame.js)
            //   2. the avatar (avatar.js)
            //   3. any portal that resides within the frame (portal.js)
            // the avatar only gets constructed after joining the session,
            // so we keep sending this message until the avatar is there,
            // receives the next message send, then sends "frame-type-received"
            // which clears this interval.
            const frameArgs = frameEntry.frameTypeArgs;
            // if this is a secondary world, and we have a record of a through-portal
            // camera location as supplied by the primary, send it to the world along
            // with the frame type (normally it's sent in a portal-camera-update message,
            // but we need to ensure that a frame that's just waking up doesn't hear
            // portal-camera-update before it's heard frame-type).
            if (frameArgs.frameType === "secondary") {
                const cameraMatrix = this.portalData.get(frameId);
                if (cameraMatrix) frameArgs.cameraMatrix = cameraMatrix;
            }
            this.sendToPortal(frameId, "frame-type", frameArgs);
            // console.log(`shell: send frame type "${frameArgs.frameType}" to portal-${frameId}`);
        }, 200);
    }

    activateFrame(toPortalId, pushState = true, transferData = null) {
        // sent on receipt of messages "portal-enter" and "world-enter", and on window
        // event "popstate"
        const frameEntry = this.frameEntry(toPortalId);
        if (!frameEntry.isMicroverse) {
            window.location.href = frameEntry.frame.src;
            return;
        }

        const fromFrameId = this.primaryFrameId;
        const fromFrame = this.primaryFrame;
        const toFrame = this.frameFromId(toPortalId);
        const portalURL = frameToPortalURL(toFrame.src, toPortalId);

        // TODO: a cleaner, more general way of doing this
        this.pendingSortFrames = [ toFrame, fromFrame ];
        if (this.pendingSortTimeout) clearTimeout(this.pendingSortTimeout);
        this.pendingSortTimeout = setTimeout(() => {
            if (this.pendingSortFrames) {
                console.warn("sorting frames after timeout");
                this.sortFrames(...this.pendingSortFrames);
                delete this.pendingSortFrames;
            }
        }, 2000);

        if (transferData && !transferData.crossingBackwards) fromFrame.style.display = 'none';

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
        this.primaryFrameId = toPortalId;
        this.portalData.delete(toPortalId); // don't hang on to where the avatar entered
        this.awaitedRenders = {}; // don't act on any secondary renders that are in the pipeline
        this.awaitedFrameTypes = {};

        if (!this.frameEntry(fromFrameId).owningFrame) {
            console.log(`shell: removing unowned secondary frame ${fromFrameId}`);
            this.removeFrame(fromFrameId);
        } else {
            console.log(`shell: sending frame-type "secondary" to portal-${fromFrameId}`, { portalURL });
            this.sendFrameType(fromFrameId, { portalURL }); // portalURL seems redundant, but supplying some non-null spec is important (see avatar "frame-type" handling)
            this.awaitedFrameTypes[fromFrameId] = true;
        }
        console.log(`shell: sending frame-type "primary" to portal-${toPortalId}`, transferData);
        this.primaryFrame.focus();
        this.sendFrameType(toPortalId, transferData);
        this.awaitedFrameTypes[toPortalId] = true;

        if (this.awaitedFramesTimeout) clearTimeout(this.awaitedFramesTimeout);
        this.awaitedFramesTimeout = setTimeout(() => {
            if (Object.keys(this.awaitedFrameTypes).length) {
                console.warn("releasing freeze after timeout");
                this.awaitedFrameTypes = {};
                this.sendToPortal(this.primaryFrameId, "release-freeze");
            }
        }, 2000);

        if (this.activeMMotion) {
            const { dx, dy } = this.activeMMotion;
            this.sendToPortal(this.primaryFrameId, "motion-start", { dx, dy });
        }
    }

    // mouse motion via joystick element

    startMMotion(e) {
        this.activeMMotion = {};
        this.updateMMotion(e, "motion-start");
    }

    endMMotion(e) {
        e.preventDefault();
        e.stopPropagation();
        this.activeMMotion = null;
        let { radius } = this.joystickLayout;
        this.trackingknob.style.transform = "translate(0px, 0px)";
        this.knob.style.transform = `translate(${radius}px, ${radius}px)`;
        this.sendToPortal(this.primaryFrameId, "motion-end");
    }

    updateMMotion(e, cmd = "motion-update") {
        e.preventDefault();
        e.stopPropagation();

        if (this.activeMMotion) {
            let { center, radius } = this.joystickLayout;

            let dx = e.offsetX - center;
            let dy = e.offsetY - center;

            this.sendToPortal(this.primaryFrameId, cmd, {dx, dy});
            this.activeMMotion.dx = dx;
            this.activeMMotion.dy = dy;

            this.trackingknob.style.transform = `translate(${dx}px, ${dy}px)`;

            let squaredDist = dx ** 2 + dy ** 2;
            if (squaredDist > radius ** 2) {
                let dist = Math.sqrt(squaredDist);
                dx = radius * dx / dist;
                dy = radius * dy / dist;
            }

            this.knob.style.transform = `translate(${radius + dx}px, ${radius + dy}px)`;
        }
    }
}
    
