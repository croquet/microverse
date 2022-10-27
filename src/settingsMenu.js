// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import {filterDomEventsOn, closeAllDialogs, loadCSS, hideShellControls} from "./worldMenu.js";
import { App } from "@croquet/worldcore-kernel";

let settingsMenu = null;
let nicknameIsValid;
let avatarIsValid;

let configuration = {};
let resolveDialog;

export function startSettingsMenu(useEnter, r) {
    // note that even if called when already in session with a default (Alice) avatar,
    // the user must provide an avatar choice to be able to change the name
    resolveDialog = r;
    nicknameIsValid = false;
    avatarIsValid = false;
    closeAllDialogs();
    loadCSS().then(() => createSettingsMenu(useEnter)).then(fillFromPrevious);
    hideShellControls();
}

export function startShareMenu(avatar) {
    closeAllDialogs();
    loadCSS().then(() => createShareMenu(avatar));
    hideShellControls();
}

function createSettingsMenu(useEnter) {
    let settings = `
<div id="joinDialog" class="dialogPanel no-select">
    <button id="close-button" type="button" class="btn btn-danger btn-x topright">x</button>
    <div id="join-container" class="content-container">
        <!--
        <div id="dialogTitle">
            <div id="titleHolder" class="settingColumn">
                <img id="titleLogo" src="assets/images/microverse-logo.png" />
            </div>
        </div>
        -->
        <div id="joinPrompt" class="settingColumn">
            <div id="joinPromptTitle">Settings</div>
            <div id="joinPromptBlurb" class="promptBlurb">Specify a nickname, and choose an avatar either
                by selecting from those on display or pasting a valid Ready Player Me URL.
            </div>
        </div>
        <div id="settings-title" class="panel-title">Settings</div>
        <div class="settings-container">
            <div id="nameInput" class="stringInputHolder settingColumn">
                <div id="namePrompt" class="namePrompt">Nickname<span>*</span></div>
                <div id="nameField" class="nameField allowSelect" contenteditable="true"></div>
                <div id="nameExplanation">Enter 1-12 characters (ASCII only).</div>
                <div id="nameFilterWarning"><br /></div>
            </div>
            <div class="namePrompt">Select Avatar</div>
            <div id="dialogAvatarSelections" class="settingColumn">
                <div id="avatarList"></div>
            </div>
            <div id="avatarURL" class="stringInputHolder settingColumn">
                <div id="avatarURLPrompt" class="namePrompt">Or, Enter an Avatar URL</div>
                <div id="avatarURLField" class="nameField avatarNameField allowSelect" contenteditable="true"></div>
            </div>
            <div id="handednessRow" class="settingsColumn">
                <div id="handednessLabel">Hand:</div>
                <div class="btn-group" id="handedness">
                    <label class="btn btn-radio-button">
                        <input type="radio" name="options" id="right" checked><span class="handedness-label">Right</span>
                    </label>
                    <label class="btn btn-radio-button">
                         <input type="radio" name="options" id="left"><span class="handedness-label">Left</span>
                    </label>
                </div>
            </div>
            <div id="dialogEnterButton" class="dialogButtonsHolder settingColumn disabled">
                <div id="enterButton">Enter</div>
            </div>
            <div id="dialogAcceptCancelButtons" class="dialogButtonsHolder settingColumn twoItems">
                <button id="cancel-button" type="button" class="btn btn-danger cancel-button">Cancel</button>
                <button type="button" id="acceptButton" class="btn btn-success">Apply</button>
            </div>
        </div>
    </div>
</div>
`.trim();

    let div = document.createElement("div");
    div.innerHTML = settings;

    settingsMenu = div.querySelector("#joinDialog");

    let closeButton = settingsMenu.querySelector("#close-button");
    let enterButton = settingsMenu.querySelector('#enterButton');
    let acceptButton = settingsMenu.querySelector('#acceptButton');
    let cancelButton = settingsMenu.querySelector('#cancel-button');
    let dialogHandedness = settingsMenu.querySelector("#handedness");
    let dialogTitle = settingsMenu.querySelector("#dialogTitle");
    let joinPrompt = settingsMenu.querySelector("#joinPrompt");
    let settingsTitle = settingsMenu.querySelector("#settings-title");
    let dialogEnterButton = settingsMenu.querySelector("#dialogEnterButton");
    let dialogAcceptCancelButtons = settingsMenu.querySelector("#dialogAcceptCancelButtons");

    let nameField = settingsMenu.querySelector('#nameField');
    nameField.addEventListener('keydown', evt => nameFieldKeydown(evt));
    nameField.addEventListener('input', (evt) => nameFieldChanged(evt));
    nameField.addEventListener('paste', (evt) => {
        evt.stopPropagation();
    });

    let avatarURLField = settingsMenu.querySelector('#avatarURLField');
    avatarURLField.addEventListener('input', (evt) => avatarURLFieldChanged(evt));
    avatarURLField.addEventListener('paste', (evt) => {
        evt.stopPropagation();
    });

    enterButton.onclick = () => dialogCloseEnter();
    acceptButton.onclick = () => accept();
    closeButton.onclick = () => closeAllDialogs();
    cancelButton.onclick = () => closeAllDialogs();

    dialogHandedness.addEventListener("input", () => handednessChanged());

    if (dialogTitle) {
        dialogTitle.classList.toggle("hidden", !useEnter);
    }
    if (joinPrompt) {
        joinPrompt.style.display = useEnter ? "flex" : "none";
    }
    if (settingsTitle) {
        settingsTitle.classList.toggle("hidden", useEnter);
    }
    if (closeButton) {
        closeButton.classList.toggle("hidden", useEnter);
    }

    if (dialogEnterButton) {
        dialogEnterButton.style.display = useEnter ? "flex" : "none";
    }
    if (dialogAcceptCancelButtons) {
        dialogAcceptCancelButtons.style.display = useEnter ? "none" : "flex";
    }

    populateAvatarSelection();

    document.body.appendChild(settingsMenu);
    filterDomEventsOn(settingsMenu);

    return Promise.resolve(settingsMenu);
}

function fillFromPrevious() {
    const localSettings = window.settingsMenuConfiguration || {};
    const oldNick = localSettings.nickname;
    const oldAvatarURL = localSettings.avatarURL;
    const oldHandedness = localSettings.handedness;
    if (oldNick) {
        const nameField = settingsMenu.querySelector('#nameField');
        nameField.textContent = oldNick;
        nameFieldChanged();
    }
    if (oldAvatarURL) {
        let predefined = findPredefined(oldAvatarURL);
        if (predefined) {
            avatarSelected(predefined);
        } else {
            const avatarURLField = settingsMenu.querySelector('#avatarURLField');
            avatarURLField.textContent = oldAvatarURL;
            avatarURLFieldChanged();
        }
    }
    if (oldHandedness) {
        if (oldHandedness === "Left") {
            const handedness = settingsMenu.querySelector('#handedness');
            handedness.value = oldHandedness;
        }
    }
    updateButtonState();
}

function nameFieldKeydown(evt) {
    evt.stopPropagation();
    if (evt.keyCode === 13 || evt.keyCode === 9) evt.preventDefault();
}

function nameFieldChanged(evt) {
    // first trim start and end whitespace and remove any line feeds that have
    // snuck in.  then replace any non-ascii characters and see if that reduces
    // the length.  if so, show the reduced string
    if (evt) {
        evt.stopPropagation();
        evt.preventDefault();
    }
    const nameField = document.getElementById('nameField');
    let value = nameField.textContent.trim().replace(/\r?\n|\r/g, '');
    const beforeFilter = value.length;
    // value = value.replace(/[\u0250-\ue007]/g, '').trim().slice(0,12).trim();
    // const unusable = value.replace(/[\x20-\x7F]/g, '');
    value = value.replace(/[^\x20-\x7F]/g, '').trim().slice(0, 12).trim();
    const div = document.getElementById('nameFilterWarning');
    div.innerHTML = value.length === beforeFilter ?
        '<br/>' :
        `Nickname filtered to "${value}"`;

    if (value.length >= 1 && value.length <= 12) {
        configuration.nickname = value;
        nicknameIsValid = true;
    } else {
        nicknameIsValid = false;
    }
    updateButtonState();
}

function avatarURLFieldChanged(evt) {
    if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    }
    const avatarURLField = settingsMenu.querySelector('#avatarURLField');
    let value = avatarURLField.textContent.trim(); // may be empty
    avatarSelected({
        url: value,
        type: "ReadyPlayerMe"
    });
}

function updateButtonState() {
    const valid = nicknameIsValid && avatarIsValid;
    const dialogEnterButton = settingsMenu.querySelector('#dialogEnterButton');
    dialogEnterButton.classList.toggle('disabled', !valid);
    const dialogAcceptCancelButtons = settingsMenu.querySelector('#dialogAcceptCancelButtons');
    dialogAcceptCancelButtons.classList.toggle('disabled', !valid);
}

function closeDialog(changed) {
    settingsMenu.remove();
    settingsMenu = null;
    if (resolveDialog) {
        resolveDialog(changed);
        resolveDialog = null;
    }
}

function dialogCloseEnter() {
    console.log("enter", configuration);
    updateLocalConfig();
    closeDialog(true);
}

function accept() {
    console.log("accept", configuration);
    updateLocalConfig();
    // if (avatar) {
    //     avatar.setSettings(configuration);
    // }
    closeDialog(true);
    closeAllDialogs();
}

function cancel() {
    closeDialog(false);
    closeAllDialogs();
}

function updateLocalConfig() {
    const existing = window.settingsMenuConfiguration || {};
    window.settingsMenuConfiguration = {
        ...existing,
        ...configuration
    };
}

let avatars = [
    {png: "https://croquet.io/microverse/assets/avatar-images/f1.png",
     url: "https://d1a370nemizbjq.cloudfront.net/0725566e-bdc0-40fd-a22f-cc4c333bcb90.glb",
     type: "ReadyPlayerMe",
    },
    {png: "https://croquet.io/microverse/assets/avatar-images/f2.png",
     url: "https://d1a370nemizbjq.cloudfront.net/50ef7f5f-b401-4b47-a8dc-1c4eda1ba8d2.glb",
     type: "ReadyPlayerMe",
    },
    {png: "https://croquet.io/microverse/assets/avatar-images/f3.png",
     url: "https://d1a370nemizbjq.cloudfront.net/b5c04bb2-a1df-4ca4-be2e-fb54799e9030.glb",
     type: "ReadyPlayerMe",
    },
    {png: "https://croquet.io/microverse/assets/avatar-images/f4.png",
     url: "https://d1a370nemizbjq.cloudfront.net/b480f1d0-3a0f-4766-9860-c213e6c50f3d.glb",
     type: "ReadyPlayerMe",
    },
    {png: "https://croquet.io/microverse/assets/avatar-images/m1.png",
     url: "https://d1a370nemizbjq.cloudfront.net/05d16812-01de-48cc-8e06-c6514ba14a77.glb",
     type: "ReadyPlayerMe",
    },
    {png: "https://croquet.io/microverse/assets/avatar-images/m2.png",
     url: "https://d1a370nemizbjq.cloudfront.net/2955d824-31a4-47e1-ba58-6c387c63b660.glb",
     type: "ReadyPlayerMe",
    },
    {png: "https://croquet.io/microverse/assets/avatar-images/m3.png",
     url: "https://d1a370nemizbjq.cloudfront.net/579d4ec8-ade3-49ea-8b52-2ea5fe097f7d.glb",
     type: "ReadyPlayerMe",
    },
    {png: "https://croquet.io/microverse/assets/avatar-images/m4.png",
     url: "https://d1a370nemizbjq.cloudfront.net/535100f3-c58c-4fd8-9fb9-4ee090e844bf.glb",
     type: "ReadyPlayerMe",
    }
];

function avatarSelected(entry) {
    if (entry.url) {
        configuration.avatarURL = entry.url;
        configuration.type = entry.type;
    }

    if (!settingsMenu) {
        return;
    }

    avatarIsValid = false;

    let holder = settingsMenu.querySelector("#avatarList");
    for (let i = 0; i < holder.childNodes.length; i++) {
        let child = holder.childNodes[i];
        if (child.getAttribute("avatarURL") === entry.url) {
            child.setAttribute("selected", true);
            avatarIsValid = true;
        } else {
            child.removeAttribute("selected");
        }
    }

    const avatarURLField = settingsMenu.querySelector('#avatarURLField');
    let value = avatarURLField.textContent.trim();
    if (value && value === entry.url) {
        avatarIsValid = true;
    } else {
        avatarURLField.textContent = "";
    }

    updateButtonState();
}

function handednessChanged() {
    let left = settingsMenu.querySelector("#left");
    configuration.handedness = !left.checked ? "Right" : "Left";
}

function findPredefined(url) {
    return avatars.find((entry) => entry.url === url);
}

function populateAvatarSelection() {
    if (!settingsMenu) {
        return;
    }
    let holder = settingsMenu.querySelector("#avatarList");

    avatars.forEach((entry) => {
        let div = document.createElement("div");
        div.classList.add("avatarThumb");
        div.onclick = () => avatarSelected(entry);
        if (entry.png.indexOf("/") >= 0) {
            div.style.backgroundImage = `url(${entry.png})`;
        } else {
            div.style.backgroundImage = `url(./assets/avatar-images/${entry.png}.png)`;
        }
        div.setAttribute("avatarURL", entry.url);
        holder.appendChild(div);
    });
}

// share dialog

function createShareMenu(avatar) {
    let share = `
    <div id="shareDialog" class="dialogPanel no-select">
        <button id="close-button" type="button" class="btn btn-danger btn-x topright">x</button>
        <div id="share-container" class="content-container">
            <div id="share-title" class="panel-title settingsColumn">Share Session<br></div>
            <div class="promptBlurb">Scan QR code or click to open a new browser tab<br> in the same session.</div>
            <div id="share-qr" class="settingsColumn"></div>

            <div class="share-settings-label settingsColumn">Copy Share Link</div>
            <div id="copy-link" class="copy-link allow-select settingsColumn">generated link</div>
            <button id="copy-button" type="button" class="btn btn-outline-success">Copy</button>

            <div class="share-settings-label settingsColumn">Save world as VRSE file</div>
            <button id="save-button" type="button" class="btn btn-outline-success">Download</button>
        </div>
    </div>`.trim();

    let div = document.createElement("div");
    div.innerHTML = share;

    let shareDialog = div.querySelector("#shareDialog");
    let shareQR = div.querySelector("#share-qr");
    let closeButton = shareDialog.querySelector("#close-button");
    let badgeHolder = document.createElement("div");
    let link = div.querySelector("#copy-link");
    let copyLink = div.querySelector("#copy-button");
    let saveWorld = div.querySelector("#save-button");

    filterDomEventsOn(shareDialog);

    let badge = App.makeQRCanvas();
    let url = App.sessionURL;
    shareQR.appendChild(badgeHolder);
    badgeHolder.appendChild(badge);
    badgeHolder.classList.add("menu-qr");
    badge.classList.add("share-qr-canvas");
    badge.onclick = () => {
        let div = document.createElement("div");
        div.innerHTML = `<a id="link" target="_blank" rel="noopener noreferrer" href="${url}"></a>`;
        document.getElementById("hud").appendChild(div);
        let a = div.querySelector("#link");
        a.click();
        div.remove();
    };

    closeButton.onclick = () => closeAllDialogs();

    link.textContent = url;

    saveWorld.onclick = (_evt) => savePressed(avatar);

    copyLink.onclick = (_evt) => copyPressed(avatar);

    document.body.appendChild(shareDialog);
}

function savePressed(myAvatar) {
    let model = myAvatar.actor.wellKnownModel("ModelRoot");

    let div = document.createElement("a");

    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(model.saveData(), null, 4));

    div.setAttribute("href", dataStr);
    div.setAttribute("download", "scene.vrse");
    div.click();
}

function copyPressed(_myAvatar) {
    let isiOSDevice = navigator.userAgent.match(/ipad|iphone/i);
    let url = App.sessionURL;

    let clipboardAPI = () => {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(url).then(() => true, () => false);
        }
        return Promise.resolve(false);
    };

    clipboardAPI().then((result) => {
        if (!result) {
            if (!isiOSDevice) {
                this.copy.value = url;
                this.copy.select();
                this.copy.setSelectionRange(0, 99999);
                document.execCommand("copy");
                return;
            }

            let range = document.createRange();
            range.selectNodeContents(this.copy);
            this.copy.textContent = url;

            let selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            this.copy.setSelectionRange(0, 100000);
            document.execCommand("copy");
        }
    });
}
