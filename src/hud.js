const joystickHTML = `
<div id="joystick">
    <div id="trackingknob"></div>
    <div id="knob"></div>
    <div id="joystick-arrows">
        <div id="joystick-arrow-n" class="joystick-arrow"></div>
        <div id="joystick-arrow-e" class="joystick-arrow"></div>
        <div id="joystick-arrow-w" class="joystick-arrow"></div>
        <div id="joystick-arrow-s" class="joystick-arrow"></div>
    </div>
</div>
`.trim();

export const fullScreenHTML = `
<div id="fullscreenBtn" class="btn btn-ui">
    <i class="fas fa-solid fa-expand"></i>
</div>
`.trim();

const container = `
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
`.trim();

export const microverseHTML = `
<div id="hud">
${container}
</div>
`.trim();
export const innerHTML = `
<div id="hud" style="display: inherit">
${container}
${joystickHTML}
</div>`.trim();

let avatar;
let joystick;
let knob;
let trackingknob;
let joystickLayout;
let activeMMotion;
let capturedPointers;
let hudFlags;
let releaseHandler;

export function setupJoystick(myAvatar) {
    debugger;
    avatar = myAvatar;
    // joystick sends events into primary frame
    capturedPointers = {};

    let hud = document.querySelector("#hud");
    joystick = hud.querySelector("#joystick");
    knob = joystick.querySelector("#knob");
    trackingknob = joystick.querySelector("#trackingknob");

    window.onresize = adjustJoystickKnob;

    if (!document.head.querySelector("#joystick-css")) {
        let css = document.createElement("link");
        css.rel = "stylesheet";
        css.type = "text/css";
        css.id = "joystick-css";
        css.onload = () => {
            adjustJoystickKnob();
            if (hudFlags) {
                this.setButtonsVisibility(hudFlags);
                hudFlags = null;
            }
        };
        let root = window.microverseDir ? window.microverseDir : "./";
        css.href = root + "assets/css/joystick.css";
        document.head.appendChild(css);
    } else {
        adjustJoystickKnob();
    }

    releaseHandler = (e) => {
        for (let k in capturedPointers) {
            joystick.releasePointerCapture(k);
        }
        capturedPointers = {};
        endMMotion(e);
    };

    joystick.onpointerdown = (e) => {
        if (e.pointerId !== undefined) {
            capturedPointers[e.pointerId] = "hiddenKnob";
            joystick.setPointerCapture(e.pointerId);
        }
        startMMotion(e); // use the knob to start
    };
    //this.joystick.onpointerenter = (e) => console.log("shell: pointerEnter")
    // this.joystick.onpointerleave = (e) => this.releaseHandler(e);
    joystick.onpointermove = (e) => updateMMotion(e);
    joystick.onpointerup = (e) => releaseHandler(e);
    joystick.onpointercancel = (e) => releaseHandler(e);
    joystick.onlostpointercapture = (e) => releaseHandler(e);
}

function adjustJoystickKnob() {
    let joystickStyle = window.getComputedStyle(joystick);
    let knobStyle = window.getComputedStyle(knob);
    let center = (parseFloat(joystickStyle.width) || 120) / 2;
    let size = (parseFloat(knobStyle.width) || 60) / 2;
    let radius = center - size;
    joystickLayout = { center, radius };
    trackingknob.style.transform = "translate(0px, 0px)"; // top-left
    knob.style.transform = `translate(${center-size}px, ${center-size}px)`; // eslint-disable-line
}

// mouse motion via joystick element

function startMMotion(e) {
    activeMMotion = {};
    updateMMotion(e, "motion-start");
}

function endMMotion(e) {
    e.preventDefault();
    e.stopPropagation();
    activeMMotion = null;
    let { radius } = joystickLayout;
    trackingknob.style.transform = "translate(0px, 0px)";
    knob.style.transform = `translate(${radius}px, ${radius}px)`;

    if (avatar) {
        avatar.motionEnd();
    }
}

function updateMMotion(e) {
    e.preventDefault();
    e.stopPropagation();

    if (activeMMotion) {
        let { center, radius } = joystickLayout;

        let dx = e.offsetX - center;
        let dy = e.offsetY - center;

        if (avatar) {
            avatar.motionUpdate(dx, dy);
        }
        activeMMotion.dx = dx;
        activeMMotion.dy = dy;
        trackingknob.style.transform = `translate(${dx}px, ${dy}px)`;

        let squaredDist = dx ** 2 + dy ** 2;
        if (squaredDist > radius ** 2) {
            let dist = Math.sqrt(squaredDist);
            dx = radius * dx / dist;
            dy = radius * dy / dist;
        }

        knob.style.transform = `translate(${radius + dx}px, ${radius + dy}px)`;
    }
}
