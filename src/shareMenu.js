// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

let settingsMenu = null;
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


 function savePressed() {
    let div = document.createElement("a");
    let dataStr = "data:text/json;charset=utf-8,";
    div.setAttribute("href", dataStr);
    div.setAttribute("download", "scene.vrse");
    div.click();
}


export function startShareMenu(badge) {
    createShareMenu(badge);
}


function createShareMenu(badge) {
    let share = `
    <div id="joinDialog" class="noselect">
    <button type="button" class="btn btn-danger btn-x topright cancel-button">x</button>
    <div id='joinDialogBody' class='wide'>
        <div id='joinSettings'>
            <div id="settings-title">Share</div>
            <div id="share-container">
                <p id="shareQR">test</p>
                <div id="share-qr"></div>
            </div>
            <div class="dialogButtonsHolder settingColumn">
                <button type="button" class="btn btn-danger cancel-button">Cancel</button>
                <div id="worldMenu-save">
                    <button type="button" class="btn btn-outline-success">Export</button>
                </div>
            </div>
        </div>
    </div>
</div>`.trim();
    let div = document.createElement("div");
    div.innerHTML = share;

    settingsMenu = div.querySelector("#joinDialog");

    let saveWorld = div.querySelector("#worldMenu-save");
    shareMenuContent = div.querySelector("#share-qr");
    shareMenu = div.querySelector("#joinDialog");
    shareMenuBody = div.querySelector("#joinDialogBody");

    const cancelButton = settingsMenu.querySelectorAll('.cancel-button');
    cancelButton.forEach(button =>{
        button.addEventListener('click', function handleClick (){
        settingsMenu.classList.add('none');
        })
    });

    shareMenuContent.appendChild(badge);
    document.body.appendChild(shareMenu, saveWorld);
    
    saveWorld.onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        savePressed();
    }


    // setShareSize()


}

function closeDialog(changed) {
    shareMenu.remove();
    shareMenu = null;
}

function cancel() {
    closeDialog(false);
}


// function setShareSize() {
//     let width = 610;
//     let height = 610; // default, for a wide screen
//     // if a dialog 610px wide wouldn't fit, switch to a narrower one and remove
//     // the 'wide' format
//     const innerWidth = window.innerWidth;
//     if (innerWidth && innerWidth < 630) {
//         shareMenuBody.classList.remove('wide');
//         width = 432;
//     }
//     shareMenuBody.style.width = `${width}px`;
//     shareMenuBody.style.height = `${height}px`;
// }


