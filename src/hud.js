const joystick = `
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

const fullScreen = `
<div id="fullscreenBtn" class="btn btn-ui">
    <i class="fas fa-solid fa-expand"></i>
</div>
`.trim();

export const shellHud = `
<div id="shell-hud">
${fullScreen}
${joystick}
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

export const shellInnerHTML = `${shellHud}`.trim();

export const microverseHTML = `
<div id="hud">
${container}
</div>
`.trim();
export const innerHTML = `
<div id="hud" style="display: inherit">
${container}
${fullScreen}
${joystick}
</div>`.trim();

