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
        input.innerHTML = `<input id="imageinput" type="file" accept="application/json;">`;
        imageInput = input.firstChild;

        imageInput.onchange = () => {
            for (const file of imageInput.files) {
                new Promise(resolve => {
                    let reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsBinaryString(file);
                }).then((data) => {
                    myAvatar.loadFromFile(data);
                })
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

function connectPressed() {
    const connectButton = document.getElementById('connectBtn');
    const connectIcon = document.getElementById('connectIcon')

    window.BehaviorViewManager.setURL("ws://localhost:9011");

    connectButton.textContent = 'Connected';
    connectButton.classList.add('connected');

    connectIcon.classList.remove('connect-icon');
    connectIcon.classList.add('connected-icon');

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

function initWorldMenu(badge) {
    let html = document.createElement("div");
    html.id = "worldMenu";
    html.classList.add("worldMenu");

    let buttons = `
<div id="worldMenu-load" class="menu-label menu-item">
    <div class="menu-icon load-icon"></div>
    <span class="menu-label-text">Import</span>
</div>
<div id="worldMenu-connect" class="menu-label menu-item">
    <div class="menu-icon connect-icon" id="connectIcon"></div>
    <span class="menu-label-text" id="connectBtn">Connect</span>
</div>
<div id="worldMenu-settings" class="menu-label menu-item">
    <div class="menu-icon settings-icon"></div>
    <span class="menu-label-text">Settings</span>
</div>
<div id="worldMenu-helpButton" class="menu-label menu-item">
    <div class="menu-icon help-icon"></div>
    <span class="menu-label-text">Help</span>
</div>
<div id="worldMenu-shareButton" class="menu-label menu-item">
    <div class="menu-icon share-icon"></div>
    <span class="menu-label-text">Share</span>
</div>
<div id="usersComeHereBtn" class="menu-label menu-item">
    <div class="menu-icon presentationMode-icon"></div>
    <span class="menu-label-text">Gather</span>
    <div id="userCount">
        <div id="userCountReadout" class="badge badge-warning"></div>
    </div>
</div>
`.trim();

    let div = document.createElement("div");
    div.innerHTML = buttons;

    let load = div.querySelector("#worldMenu-load");
    let connect = div.querySelector("#worldMenu-connect");
    let settings = div.querySelector("#worldMenu-settings");
    let share = div.querySelector("#worldMenu-shareButton");
    let help = div.querySelector("#worldMenu-helpButton");
    let presentationMode = div.querySelector("#usersComeHereBtn");

    html.appendChild(badge);
    badge.id = "worldMenu-qr";
    badge.classList.add("menu-qr", "menu-item");

    html.appendChild(load);
    html.appendChild(connect);
    html.appendChild(presentationMode);
    html.appendChild(share);
    html.appendChild(settings);
    html.appendChild(help);

    worldMenu = html;

    filterDomEventsOn(worldMenu);
    worldMenuVisible = false;
    document.getElementById("hud").appendChild(worldMenu);
}

function toggleMenu(myAvatar) {
    if (worldMenuVisible) {
        worldMenu.classList.remove("menuVisible");
        worldMenuVisible = false;
        return;
    }

    if (worldMenu.lastChild.id === "worldMenu-forceStop") {
        worldMenu.lastChild.remove();
    }

    if (myAvatar.actor.service("PlayerManager").presentationMode) {
        let presentation = `
            <div id="worldMenu-forceStop" class="menu-label menu-item">
                <span class="menu-label-text">Stop Presentation</span>
            </div>`.trim();

        let div = document.createElement("div");
        div.innerHTML = presentation;
        worldMenu.appendChild(div.firstChild);
    }

    let div;

    div = worldMenu.querySelector("#worldMenu-qr");
    div.onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();

        if (evt.shiftKey || isMobile) {
            switchQRView(myAvatar);
            return;
        }
        qrPressed(myAvatar, window.location);
    }

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

    div = worldMenu.querySelector("#worldMenu-forceStop");
    if (div)　div.onclick = () => forceStop(myAvatar);

    worldMenuVisible = true;
    worldMenu.classList.add("menuVisible");

    return worldMenu;
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
}

export function hideShellControls() {
    sendToShell("hud", {joystick: false, fullscreen: false});
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

