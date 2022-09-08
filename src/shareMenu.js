// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

let shareMenu = null;
let shareMenuBody = null;

let nicknameIsValid;
let avatarIsValid;

let configuration = {};

let resolveDialog;

// let avatar;// we need to be careful to update this variable

// export function setAvatarForshareMenu(myAvatar) {
//     avatar = myAvatar;
// }

export function startShareMenu(useEnter, r) {
    // note that even if called when already in session with a default (Alice) avatar,
    // the user must provide an avatar choice to be able to change the name
    resolveDialog = r;
    nicknameIsValid = false;
    avatarIsValid = false;
    loadCSS().then(() => createShareMenu(useEnter));
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

function createShareMenu(useEnter) {
    let share = `
<div id="joinDialog" class="noselect">
  <div id='joinDialogBody' class='wide'>
    <div id='dialogTitle'>
        <div id='titleHolder' class='settingColumn'>
            <img id='titleLogo' src='assets/images/microverse-logo.png'/>
        </div>
    </div>
    <div id='joinSettings'>
        <div id="settings-title">Share</div>

        <div id='dialogAcceptCancelButtons' class='dialogButtonsHolder settingColumn'>
            <div id='cancelButton'>Cancel</div>
        </div>
    </div>
  </div>
</div>`.trim();

    let div = document.createElement("div");
    div.innerHTML = share;

    shareMenu = div.querySelector("#joinDialog");
    shareMenuBody = div.querySelector("#joinDialogBody");

    const cancelButton = shareMenu.querySelector('#cancelButton');
    cancelButton.addEventListener('click', () => cancel());

    document.body.appendChild(shareMenu);
    
    setShareSize()
}

function closeDialog(changed) {
    shareMenu.remove();
    shareMenu = null;
}

function cancel() {
    closeDialog(false);
}


function setShareSize() {
    let width = 610;
    let height = 610; // default, for a wide screen
    // if a dialog 610px wide wouldn't fit, switch to a narrower one and remove
    // the 'wide' format
    const innerWidth = window.innerWidth;
    if (innerWidth && innerWidth < 630) {
        shareMenuBody.classList.remove('wide');
        width = 432;
    }
    shareMenuBody.style.width = `${width}px`;
    shareMenuBody.style.height = `${height}px`;
}


