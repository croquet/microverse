// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

let settingsMenu = null;
let settingsMenuBody = null;

let nicknameIsValid;
let avatarIsValid;

let configuration = {};

let resolveDialog;

// let avatar;// we need to be careful to update this variable

// export function setAvatarForSettingsMenu(myAvatar) {
//     avatar = myAvatar;
// }

export function startSettingsMenu(useEnter, r) {
    // note that even if called when already in session with a default (Alice) avatar,
    // the user must provide an avatar choice to be able to change the name
    resolveDialog = r;
    nicknameIsValid = false;
    avatarIsValid = false;
    loadCSS().then(() => createSettingsMenu(useEnter)).then(fillFromPrevious);
}

function loadCSS() {
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

function createSettingsMenu(useEnter) {
    let settings = `

    <div id="joinDialog" class="noselect">
    <div id='joinDialogBody' class='wide'>
    <button type="button" id="cancelButton" class="btn btn-danger btn-x">x</button>
        <div id='dialogTitle'>
            <div id='titleHolder' class='settingColumn'>
                <img id='titleLogo' src='assets/images/microverse-logo.png' />
            </div>
        </div>
        <div id='joinSettings'>
            <div id='joinPrompt' class='settingColumn'>
                <div id='joinPromptTitle'>Choose nickname and avatar</div>
                <div id='joinPromptBlurb'>To enter this world you must specify a nickname, and choose an avatar either
                    by selecting from those on display or pasting a valid Ready Player Me URL.</div>
            </div>
            <div id="settings-title">Settings</div>
            <div class="settings-container">
                <div class="settings-padding">
                    <div id='nameInput' class='stringInputHolder settingColumn'>
                        <div id='namePrompt' class='namePrompt'>Nickname<span>*</span></div>
                        <div id='nameField' class="nameField allowSelect" contenteditable='true'></div>
                        <div id='nameExplanation'>Enter 1-12 characters (ASCII only).</div>
                        <div id='nameFilterWarning'><br /></div>
                    </div>
                    <div class='namePrompt'>Select Avatar</div>
                    <div id='dialogAvatarSelections' class='settingColumn'>
                        <div id='avatarList'></div>
                    </div>
                    <div id='avatarURL' class='stringInputHolder settingColumn'>
                        <div id='avatarURLPrompt' class='namePrompt'>Or, Enter an Avatar URL</div>
                        <div id='avatarURLField' class="nameField avatarNameField allowSelect" contenteditable='true'>
                        </div>
                    </div>
                    <div id="handednessRow" class="settingsColumn">
                    
                        <div id="handednessLabel">Hand:</div>
                            <div class="btn-group btn-group-toggle" data-toggle="buttons" id='handedness'>
                                <label class="btn btn-secondary active">
                                    <input type="radio" name="options" id="right" autocomplete="off" checked> Right
                                </label>
                                <label class="btn btn-secondary">
                                    <input type="radio" name="options" id="left" autocomplete="off"> Left
                                </label>
                            </div>
                        </div>
                </div>
            </div>

            <div id='dialogEnterButton' class='dialogButtonsHolder settingColumn oneItem disabled'>
                <div id='enterButton'>Enter</div>
            </div>
            <div id='dialogAcceptCancelButtons' class='dialogButtonsHolder settingColumn'>
                <button type="button" id="cancelButton" class="btn btn-danger">Cancel</button>
                <button type="button" id="acceptButton" class="btn btn-success">Apply</button>
            </div>
        </div>
    </div>
</div>
</div>
</div>
</div>
`.trim();

    let div = document.createElement("div");
    div.innerHTML = settings;

    settingsMenu = div.querySelector("#joinDialog");
    settingsMenuBody = div.querySelector("#joinDialogBody");

    const nameField = settingsMenu.querySelector('#nameField');
    nameField.addEventListener('keydown', evt => nameFieldKeydown(evt));
    nameField.addEventListener('input', (evt) => nameFieldChanged(evt));
    nameField.addEventListener('paste', (evt) => {
        evt.stopPropagation();
    });

    const avatarURLField = settingsMenu.querySelector('#avatarURLField');
    avatarURLField.addEventListener('input', (evt) => avatarURLFieldChanged(evt));
    avatarURLField.addEventListener('paste', (evt) => {
        evt.stopPropagation();
    });

    const enterButton = settingsMenu.querySelector('#enterButton');
    enterButton.addEventListener('click', () => dialogCloseEnter());

    const acceptButton = settingsMenu.querySelector('#acceptButton');
    acceptButton.addEventListener('click', () => accept());

    const cancelButton = settingsMenu.querySelector('#cancelButton');
    cancelButton.addEventListener('click', () => cancel());

    let dialogHandedness = settingsMenu.querySelector("#handedness");
    dialogHandedness.addEventListener("input", () => handednessChanged());

    document.body.appendChild(settingsMenu);

    let stopPropagation = (evt) => evt.stopPropagation();
    settingsMenuBody.addEventListener("pointerdown", stopPropagation);
    settingsMenuBody.addEventListener("pointermove", stopPropagation);
    settingsMenuBody.addEventListener("pointerup", stopPropagation);
    settingsMenuBody.addEventListener("click", stopPropagation);
    settingsMenuBody.addEventListener("keydown", stopPropagation);
    settingsMenuBody.addEventListener("keyup", stopPropagation);

    let dialogTitle = settingsMenu.querySelector("#dialogTitle");
    let joinPrompt = settingsMenu.querySelector("#joinPrompt");
    let dialogEnterButton = settingsMenu.querySelector("#dialogEnterButton");
    let dialogAcceptCancelButtons = settingsMenu.querySelector("#dialogAcceptCancelButtons");

    dialogTitle.classList.toggle("hidden", !useEnter);
    joinPrompt.classList.toggle("hidden", !useEnter);
    dialogEnterButton.classList.toggle("hidden", !useEnter);
    dialogAcceptCancelButtons.classList.toggle("hidden", useEnter);

    populateAvatarSelection();
    setSettingsSize();
    return Promise.resolve(settingsMenu);
}

function setSettingsSize() {
    let width = 610;
    let height = 610; // default, for a wide screen
    // if a dialog 610px wide wouldn't fit, switch to a narrower one and remove
    // the 'wide' format
    const innerWidth = window.innerWidth;
    if (innerWidth && innerWidth < 630) {
        settingsMenuBody.classList.remove('wide');
        width = 432;
    }
    settingsMenuBody.style.width = `${width}px`;
    settingsMenuBody.style.height = `${height}px`;
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
}

function cancel() {
    closeDialog(false);
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
    let dialogHandedness = settingsMenu.querySelector("#handedness");
    configuration.handedness = dialogHandedness.value;
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