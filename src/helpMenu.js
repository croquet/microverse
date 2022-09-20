// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

let helpMenuContent = null;
let helpMenu = null;
let helpMenuBody = null;

let nicknameIsValid;
let avatarIsValid;

let configuration = {};

let resolveDialog;

// let avatar;// we need to be careful to update this variable

// export function setAvatarForhelpMenu(myAvatar) {
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


 function savePressed() {
    let div = document.createElement("a");
    let dataStr = "data:text/json;charset=utf-8,";
    div.setAttribute("href", dataStr);
    div.setAttribute("download", "scene.vrse");
    div.click();
}


export function startHelpMenu() {
    createHelpMenu();
}



function createHelpMenu() {
    let help = `
    <div id="joinDialog" class="noselect">
    <div id='joinDialogBody' class='wide'>
        <div id='joinSettings'>
            <div id="settings-title">Help</div>
            <div id="share-container">
                <p id="shareQR">test</p>
                <div id="share-qr"></div>
            </div>
            <div class="dialogButtonsHolder settingColumn">
                <button type="button" id="cancelButton" class="btn btn-danger">Cancel</button>
            </div>
        </div>
    </div>
</div>`.trim();

    let div = document.createElement("div");
    div.innerHTML = help;

    helpMenu = div.querySelector("#joinDialog");
    helpMenuBody = div.querySelector("#joinDialogBody");

    const cancelButton = helpMenu.querySelector('#cancelButton');
    cancelButton.addEventListener('click', () => cancel());

    document.body.appendChild(helpMenu);
    

    setHelpSize()


}

function closeDialog(changed) {
    helpMenu.remove();
    helpMenu = null;
}

function cancel() {
    closeDialog(false);
}


function setHelpSize() {
    let width = 610;
    let height = 610; // default, for a wide screen
    // if a dialog 610px wide wouldn't fit, switch to a narrower one and remove
    // the 'wide' format
    const innerWidth = window.innerWidth;
    if (innerWidth && innerWidth < 630) {
        helpMenuBody.classList.remove('wide');
        width = 432;
    }
    helpMenuBody.style.width = `${width}px`;
    helpMenuBody.style.height = `${height}px`;
}


