import { startHelpMenu } from "./helpMenu.js";
import { sendToShell } from "./frame.js";

let worldMenu = null;
let worldMenuVisible = false;
let imageInput = null;

let isMobile = !!("ontouchstart" in window);

function qrPressed(_myAvatar, url) {
    let div = document.createElement("div");
    div.innerHTML = `<a id="link" target="_blank" rel="noopener noreferrer" href="${url}"></a>`;
    document.getElementById("hud").appendChild(div);
    let a = div.querySelector("#link");
    a.click();
    div.remove();
}

function loadPressed(myAvatar) {
    if (!imageInput) {
        let input = document.createElement("div");
        input.innerHTML = `<input id="imageinput" type="file" accept="application/json,image/*,.glb,.obj..fbx,.zip,.svg,.vrse,.exr,.pdf,.mp3,.wav">`;
        imageInput = input.firstChild;

        let getFileType = (fileName) => {
            let index = fileName.lastIndexOf(".");
            if (index >= 0) {
                return fileName.slice(index + 1).toLowerCase();
            }
            return null;
        };

        imageInput.onchange = () => {
            for (const file of imageInput.files) {
                let type = getFileType(file.name);

                new Promise(resolve => {
                    let reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsArrayBuffer(file);
                }).then((data) => {
                    if (type === "vrse") {
                        myAvatar.loadvrse(data);
                    } else {
                        myAvatar.analyzeAndUploadFile(data, file.name, type);
                    }
                });
            }
            imageInput.value = "";
        };
    }

    document.getElementById("hud").appendChild(imageInput);

    imageInput.click();
    if (worldMenuVisible) {
        toggleMenu();
    }
}

export function connectFeedback(flag) {
    let connectButton = document.getElementById('connectBtn');
    let connectIcon = document.getElementById('connectIcon')

    if (flag) {
        connectButton.textContent = 'Connected';
        connectButton.classList.add('connected');
        connectIcon.classList.remove('connect-icon');
        connectIcon.classList.add('connected-icon');
    } else {
        connectButton.textContent = 'Connect';
        connectButton.classList.remove('connected');
        connectIcon.classList.add('connect-icon');
        connectIcon.classList.remove('connected-icon');
    }
}


function connectPressed(myAvatar) {
    let manager = myAvatar.service("BehaviorViewManager");

    if (manager) {
        manager.setURL("ws://localhost:9011", connectFeedback);
    }
}

function settingsPressed(myAvatar) {
    if (myAvatar) {
        myAvatar.showSettingsMenu();
        sendToShell("hud", {joystick: false, fullscreen: false});
    }
    toggleMenu();
}

function sharePressed(myAvatar) {
    if (myAvatar) {
        myAvatar.showShareMenu();
        sendToShell("hud", {joystick: false, fullscreen: false});
    }
    toggleMenu();
}

function helpPressed(myAvatar) {
    if (myAvatar) {
        startHelpMenu();
        sendToShell("hud", {joystick: false, fullscreen: false});
    }
    toggleMenu();
}

function switchQRView(_myAvatar) {
    let qrDiv = worldMenu.querySelector("#qrDiv");
    let statsDiv = worldMenu.querySelector("#statsDiv");

    let cls = "statsHidden";

    if (qrDiv.classList.contains(cls)) {
        qrDiv.classList.toggle(cls, false);
        statsDiv.classList.toggle(cls, true);
    } else {
        qrDiv.classList.toggle(cls, true);
        statsDiv.classList.toggle(cls, false);
    }
}

function forceStop(myAvatar) {
    myAvatar.say("stopPresentation");
    if (worldMenuVisible) {
        toggleMenu();
    }
}

function initWorldMenu() {
    let html = document.createElement("div");
    html.id = "worldMenu";
    html.classList.add("worldMenu");

    let buttons = `
<div id="worldMenu-load" class="menu-label menu-item">
    <div class="menu-icon import-icon"></div>
    <span class="menu-label-text">Import</span>
</div>
<div id="worldMenu-connect" class="menu-label menu-item">
    <div class="menu-icon connect-icon" id="connectIcon"></div>
    <span class="menu-label-text" id="connectBtn">Connect</span>
</div>
<div id="worldMenu-gather" class="menu-label menu-item">
    <div class="menu-icon presentationMode-icon"></div>
    <span class="menu-label-text">Gather</span>
</div>
<div id="worldMenu-shareButton" class="menu-label menu-item">
    <div class="menu-icon share-icon"></div>
    <span class="menu-label-text">Share</span>
</div>
<div id="worldMenu-settings" class="menu-label menu-item">
    <div class="menu-icon settings-icon"></div>
    <span class="menu-label-text">Settings</span>
</div>
<div id="worldMenu-helpButton" class="menu-label menu-item">
    <div class="menu-icon help-icon"></div>
    <span class="menu-label-text">Help</span>
</div>
<div id="fullscreenBtn" class="menu-label menu-item">
    <div class="menu-icon fullscreen-icon"></div>
    <span class="menu-label-text">Fullscreen</span>
</div>
`.trim();

    let div = document.createElement("div");
    div.innerHTML = buttons;

    let load = div.querySelector("#worldMenu-load");
    let connect = div.querySelector("#worldMenu-connect");
    let settings = div.querySelector("#worldMenu-settings");
    let share = div.querySelector("#worldMenu-shareButton");
    let help = div.querySelector("#worldMenu-helpButton");
    let presentationMode = div.querySelector("#worldMenu-gather");
    let fullscreen = div.querySelector("#fullscreenBtn");


    html.appendChild(load);
    html.appendChild(connect);
    html.appendChild(presentationMode);
    html.appendChild(fullscreen);
    html.appendChild(share);
    html.appendChild(settings);
    html.appendChild(help);



    worldMenu = html;

    filterDomEventsOn(worldMenu);
    worldMenuVisible = false;
    document.getElementById("hud").appendChild(worldMenu);
}


function setMenuItems(myAvatar) {
    let gatherItem = worldMenu.querySelector("#worldMenu-gather");
    let label = gatherItem.querySelector("span");

    if (myAvatar.actor.service("PlayerManager").presentationMode) {
        label.textContent = "Release Users";
    } else {
        label.textContent = "Gather Users";
    }

    let div;

    div = worldMenu.querySelector("#worldMenu-load");
    div.onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        loadPressed(myAvatar);
    }

    div = worldMenu.querySelector("#worldMenu-connect");
    div.onclick = () => connectPressed(myAvatar);

    div = worldMenu.querySelector("#worldMenu-settings");
    if (div) div.onclick = () => settingsPressed(myAvatar);

    div = worldMenu.querySelector("#worldMenu-shareButton");
    if (div) div.onclick = () => {sharePressed(myAvatar)};

    div = worldMenu.querySelector("#worldMenu-helpButton");
    if (div) div.onclick = () => helpPressed(myAvatar);

    div = gatherItem;
    if (div) {
        div.onclick = () => {
            toggleMenu();
            if (myAvatar.actor.service("PlayerManager").presentationMode) {
                forceStop(myAvatar);
            } else {
                myAvatar.comeToMe();
            }
        };
    }

    let fullscreenBtn = worldMenu.querySelector("#fullscreenBtn");
fullscreenBtn.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log("help")

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
}

}

function toggleMenu(myAvatar) {
    if (worldMenuVisible) {
        worldMenu.classList.remove("menuVisible");
        worldMenuVisible = false;
        return;
    }

    setMenuItems(myAvatar);

    worldMenuVisible = true;
    worldMenu.classList.add("menuVisible");
}

export function updateWorldMenu(myAvatar) {
    if (!worldMenuVisible) {return;}
    setMenuItems(myAvatar);
}

export function setupWorldMenuButton(myAvatar, App, sessionId) {
    if (!worldMenu) {
        let badge = document.createElement("div");
        let statsDiv = document.createElement("div");
        statsDiv.id = "statsDiv";
        let qrDiv = document.createElement("div");
        qrDiv.id = "qrDiv";

        statsDiv.classList.add("statsHidden");

        badge.appendChild(qrDiv);
        badge.appendChild(statsDiv);

        App.root = badge;
        App.badge = false;
        App.qrcode = qrDiv;
        App.stats = statsDiv;
        App.makeSessionWidgets(sessionId);
        qrDiv.onclick = null;

        initWorldMenu(badge);
    }
    let worldMenuBtn = document.querySelector("#worldMenuBtn");

    worldMenuBtn.onclick = () => toggleMenu(myAvatar);
    filterDomEventsOn(worldMenuBtn);
}

export function filterDomEventsOn(elem) {
    elem.onpointerdown = (evt) => evt.stopPropagation();
    elem.onpointerup = (evt) => evt.stopPropagation();
    elem.onpointermove = (evt) => evt.stopPropagation();
    elem.onwheel = (evt) => evt.stopPropagation();
}

export function closeAllDialogs() {
    let panels = document.querySelectorAll(".dialogPanel");
    panels.forEach((p) => p.remove());
    sendToShell("hud", {joystick: true, fullscreen: true});

    let homeBtn = document.querySelector("#homeBtn");
    if (homeBtn) {
        homeBtn.style.display = "flex";
    }
}

export function hideShellControls() {
    sendToShell("hud", {joystick: false, fullscreen: false});
    let homeBtn = document.querySelector("#homeBtn");
    if (homeBtn) {
        homeBtn.style.display = "none";
    }
}

export function loadCSS() {
    if (!document.head.querySelector("#settings-css")) {
        return new Promise((resolve, reject) => {
            let css = document.createElement("link");
            css.rel = "stylesheet";
            css.type = "text/css";
            css.id = "settings-css";
            css.href = "./assets/css/settings.css";
            css.onload = resolve;
            css.onerror = reject;
            document.head.appendChild(css);
        });
    }
    return Promise.resolve(true);
}
