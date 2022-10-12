// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io
import { sendToShell } from "./frame.js";


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
    createShareMenu(badge)
}


function createShareMenu(badge) {
    let share = `
    <div id="shareDialog" class="noselect">
    <button type="button" class="btn btn-danger btn-x topright cancel-button">x</button>
    <div id='joinDialogBody' class='wide'>
        <div id='joinSettings'>
            <div id="share-container">
                <p id="shareQR" class="share-title">Share Session<br></p>
                <p class="desc">Scan QR code or click to open a new browser tab<br> in the same session.</p>
                <div id="share-qr"></div>

                <p class="share-title">Copy Share Link</p>
                <div class="copy-link">generated link</div><div class="btn copy-btn btn-outline-success">Copy</div>

                <p class="share-title">Save Microverse file</p>
                <button type="button" class="btn btn-outline-success" id="worldMenu-save">Download</button>
                
            </div>
        </div>
    </div>
</div>`.trim();
    let div = document.createElement("div");
    div.innerHTML = share;

    settingsMenu = div.querySelector("#shareDialog");

    let saveWorld = div.querySelector("#worldMenu-save");
    shareMenuContent = div.querySelector("#share-qr");
    shareMenu = div.querySelector("#shareDialog");
    shareMenuBody = div.querySelector("#joinDialogBody");


    function showUi(){
        const ui = document.body.querySelectorAll('.ui');
    
        for (let i = 0; i<ui.length; ++i){
            ui[i].classList.remove("none");
        };
        sendToShell("hud",{joystick:true,fullscreen:true})
    }

    function close() {
        const el = document.body.querySelector("#shareDialog");
        if (el) {
            el.classList.remove('none')
            el.classList.add('show')
            return;
        }else{
            el.classList.remove('show')
            el.classList.add('none')
        }
      }
    
      const cancelButton = shareMenu.querySelectorAll('.cancel-button');
      cancelButton.forEach(button =>{
          button.addEventListener('click', function handleClick (){
          shareMenu.remove();
          showUi();
          sendToShell("hud",{joystick:true,fullscreen:true})
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
