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
    <button type="button" id="cancelButton" class="btn btn-danger btn-x topright">x</button>
    <div id='joinDialogBody' class='wide'>
      <div id='joinSettings'>
        <div id="settings-title">Help</div>
        <div id="share-container">
          <div id="table-wrapper">
            <div id="table-scroll" id="scrollbar">
  
              <table class="help-tips">
                <tr class="help-row">
                  <td>
                    <p class="table-head">Navigate</p>
                    <p class="table-desc">Move around using the joystick, arrow keys or WASD. The location of the joystick
                      on screen can be
                      changed in the settings.</p>
                  </td>
                  <td class="icon-column">
                    <div class="icons"><img src="../assets/images/move.png" /><img src="../assets/images/wasd.png" />
                    </div>
                  </td>
                </tr>
                <tr class="help-row">
                  <td>
                    <p class="table-head">Look</p>
                    <p class="table-desc">Click and drag to change camera look position.</p>
                  </td>
                  <td class="icon-column">
                    <div class="icons"><img src="../assets/images/look.png" /></div>
                  </td>
                </tr>
                <tr class="help-row">
                <td>
                  <p class="table-head">Manipulate</p>
                  <p class="table-desc">Ctrl + click on an object to open that object's behavior properties. select from a premade menu or create your own (read docs)</p>
                </td>
                <td class="icon-column">
                  <div class="icons"><img src="../assets/images/ctrlclick.png" />
                  </div>
                </td>
              </tr>
                <tr class="help-row">
                  <td>
                    <p class="table-head">Fullscreen</p>
                    <p class="table-desc">Make your browser fullscreen.</p>
                  </td>
                  <td class="icon-column"><i class="fa-solid fa-expand icons"></i></td>
                </tr>
                <tr class="help-row">
                  <td>
                    <p class="table-head">Home</p>
                    <p class="table-desc">Reset location back to original landing place.</p>
                  </td>
                  <td class="icon-column"><i class="fa-light fa-house icons"></i></td>
                </tr>
                <tr class="help-row">
                  <td>
                    <p class="table-head">Gather</p>
                    <p class="table-desc">Shows how many users in a world. Click to "gather" all users to you.</p>
                  </td>
                  <td class="icon-column"><i class="fa-light fa-users icons"></i></td>
                </tr>
                <tr class="help-row">
                  <td>
                    <p class="table-head">Import</p>
                    <p class="table-desc">Import any of these formats from your desktop directly
                    into the Microverse IDE. Either drag and drop, or click the import icon.</p>
                  </td>
                  <td class="icon-column">
                    <div class="icons"><img src="../assets/images/import.png" /></div>
                  </td>
                </tr>
                <tr class="help-row">
                  <td>
                    <p class="table-head">Connect</p>
                    <p class="table-desc">With your favorite IDE open in the background, click connect to link the two for a live programming environment.</p>
                  </td>
                  <td class="icon-column">
                    <div class="icons"><img src="../assets/images/connect.png" /></div>
                  </td>
                </tr>
                <tr class="help-row">
                  <td>
                    <p class="table-head">Share</p>
                    <p class="table-desc">Save your Microverse as a .vrse file to share or use the QR code to share the session with others.</p>
                  </td>
                  <td class="icon-column">
                    <div class="icons"><img src="../assets/images/share.png" /></div>
                  </td>
                 </tr>
                <tr class="help-row">
                  <td>
                    <p class="table-head">Settings</p>
                    <p class="table-desc">Update your in-world nickname, select from default avatars or paste a link to your own.</p>
                  </td>
                  <td class="icon-column">
                    <div class="icons"><img src="../assets/images/settings.png" /></div>
                  </td>
                </tr>
              </table>
            </div>
          </div>
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


