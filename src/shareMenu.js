// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

let shareMenuContent = null;
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
function loadCSS() {
            let css = document.createElement("link");
            css.rel = "stylesheet";
            css.type = "text/css";
            css.id = "settings-css";
            css.href = "./assets/css/settings.css";
            document.head.appendChild(css);
}

 loadCSS();

export function startShareMenu(badge) {
    createShareMenu(badge);
}

function createShareMenu(badge) {
    let share = `
<div id="joinDialog" class="noselect">
    <div id='joinDialogBody' class='wide'>
        <div id='joinSettings'>
            <div id="settings-title">Share</div>
            <div id="share-qr"></div>
            <div id='cancelButton'>Cancel</div>
        </div>        
    </div>
</div>`.trim();

    let div = document.createElement("div");
    div.innerHTML = share;

    shareMenuContent = div.querySelector("#share-qr");
    shareMenu = div.querySelector("#joinDialog");
    shareMenuBody = div.querySelector("#joinDialogBody");

    const cancelButton = shareMenu.querySelector('#cancelButton');
    cancelButton.addEventListener('click', () => cancel());

    shareMenuContent.appendChild(badge);
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


