// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { startMicroverse } from "./src/microverse.js";


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
    shell = new VanillaShell();
}

class VanillaShell {
    constructor() {
        if (!this.hud) {
            this.hud = document.querySelector("#hud");
            if (!this.hud) {
                let div = document.createElement("div");
                div.innerHTML = `
<div id="hud" style="display: inherit">
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
                document.body.appendChild(this.hud);
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
                this.trackingknob = this.joystick.querySelector("#trackingknob");
            }
        }

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
        } else {
            this.adjustJoystickKnob();
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

        window.addEventListener("message", e => {
            if (e.data?.message?.startsWith?.(PREFIX)) {
                const cmd = e.data.message.substring(PREFIX.length);
                this.receiveFromPortal(null, this, cmd, e.data);
                return;
            }
        });

        startMicroverse();
    }

    adjustJoystickKnob() {
        let joystickStyle = window.getComputedStyle(this.joystick);
        let knobStyle = window.getComputedStyle(this.knob);
        let center = (parseFloat(joystickStyle.width) || 120) / 2;
        let size = (parseFloat(knobStyle.width) || 60) / 2;
        let radius = center - size;
        this.joystickLayout = { center, radius };
        this.trackingknob.style.transform = "translate(0px, 0px)"; // top-left
        this.knob.style.transform = `translate(${center-size}px, ${center-size}px)`; // eslint-disable-line
    }

    frameEntry(_frameId) {
    }

    frameFromId(_frameId) {
    }

    portalId(_targetFrame) {
        return null;
    }

    get primaryFrame() { return this.frameFromId(this.primaryFrameId) }

    addFrame(_owningFrameId, _portalURL) {
    }

    removeFrame(_portalId) {
    }

    sortFrames(_mainFrame, _portalFrame) {
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
        debugger;
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

    sendToPortal(_potalId, cmd, data = {}) {
        console.log(data);
        data.message = `${PREFIX}${cmd}`;
        window.postMessage(data, "*");
    }

    sendFrameType() {
    }

    activateFrame() {
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

function loadLocalStorage() {
    if (!window.localStorage) { return null; }
    try {
        let localSettings = JSON.parse(window.localStorage.getItem('microverse-settings'));
        if (!localSettings || localSettings.version !== "1") {
            throw new Error("different version of data");
        }
        return localSettings;
    } catch (e) { return null; }
}

function saveLocalStorage(configuration) {
    if (!window.localStorage) { return; }
    try {
        let {nickname, type, avatarURL, handedness} = configuration;
        let settings = {
            version: "1",
            nickname,
            type,
            avatarURL,
            handedness
        };
        window.localStorage.setItem('microverse-settings', JSON.stringify(settings));
    } catch (e) { /* ignore */ }
}
