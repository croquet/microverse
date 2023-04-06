// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import {
    filterDomEventsOn,
    closeAllDialogs,
    hideShellControls,
} from "./hud.js";

let simplerMenu;

export function startHelpMenu(simplerMenuFlag) {
    simplerMenu = simplerMenuFlag;
    createHelpMenu();
}

function createHelpMenu() {
    let help = `
    <div id="helpDialog" class="dialogPanel no-select">
    <button id="close-button" type="button" class="btn btn-danger btn-x topright">x</button>
        <div id="share-container" class="content-container">
            <div id="help-title" class="panel-title">Help</div>
            <div id="table-wrapper">
                <div id="table-scroll" id="scrollbar">
                    <table class="help-table">
                        <tr class="help-row">
                            <td>
                                <p class="table-head">Navigate</p>
                                <p class="table-desc">Move around using the joystick or WASD keys.</p>
                            </td>
                            <td class="icon-column">
                                <div class="icons">
                                    <div class="help-pane-icon move-icon"></div>
                                    <div class="help-pane-icon wasd-icon"></div>
                                </div>
                            </td>
                        </tr>
                        <tr class="help-row">
                            <td>
                                <p class="table-head">Look</p>
                                <p class="table-desc">Click and drag to change camera look position.</p>
                            </td>
                        <td class="icon-column">
                            <div class="icons"><div class="help-pane-icon look-icon"></div>
                        </td>
                    </tr>
                    <tr class="help-row" id="manipulate-row">
                        <td>
                            <p class="table-head">Manipulate</p>
                            <p class="table-desc">Ctrl + click (on PC) or CMD + Click (on Mac) on an object to open and cycle through the "gizmo" tools. The icon of a multi-pane tool is a button to open the property sheet.</p>
                        </td>
                        <td class="icon-column">
                            <div class="icons">
                                <div class="help-pane-icon ctrlclick-icon"></div>
                            </div>
                        </td>
                    </tr>
                    <tr class="help-row" id="fullscreen-row">
                        <td>
                            <p class="table-head">Fullscreen</p>
                            <p class="table-desc">Make your browser fullscreen.</p>
                        </td>
                        <td class="icon-column"><i class="fas fa-solid fa-expand icons"></i></td>
                    </tr>
                    <tr class="help-row">
                        <td>
                            <p class="table-head">Home</p>
                            <p class="table-desc">Reset location back to original landing place.</p>
                        </td>
                        <td class="icon-column"><i class="fas fa-regular fa-house"></i>
                        </td>
                    </tr>
                    <tr class="help-row">
                        <td>
                            <p class="table-head">Gather</p>
                            <p class="table-desc">Shows how many users in a world. Click to "gather" all users to you.</p>
                        </td>
                        <td class="icon-column"><i class="fas fa-solid fa-users icons"></i></td>
                    </tr>
                    <tr class="help-row" id="import-row">
                        <td>
                            <p class="table-head">Import</p>
                            <p class="table-desc">Import from your device or drag and drop it into the Microverse.</p>
                            <p class="table-desc">
                            Supported formats are:<br>
                            
                            <b>3D:</b> .glb, .obj, .fbx, .vrml
                            <br>
                            <b>Files:</b> svg, png, jpeg, gif, .pdf
                            
                            </p>
                        </td>
                        <td class="icon-column">
                            <div class="icons">
                                <i class="fa-solid fa-upload menu-icon"></i>
                            </div>
                        </td>
                     </tr>
                     <tr class="help-row" id="connect-row">
                         <td>
                             <p class="table-head">Connect</p>
                             <p class="table-desc">Link your text editor to edit behavior file code.</p>
                         </td>
                         <td class="icon-column">
                             <div class="icons">
                                <i class="fa-solid fa-link menu-icon"></i>
                             </div>
                         </td>
                     </tr>
                     <tr class="help-row">
                         <td>
                             <p class="table-head">Invite</p>
                             <p class="table-desc">Use the QR code or the share link to share the session with others.</p>
                         </td>
                         <td class="icon-column">
                             <div class="icons">
                                <i class="fas fa-user-plus"></i>
                             </div>
                         </td>
                     </tr>
                     <tr class="help-row" id="settings-row">
                         <td>
                             <p class="table-head">Settings</p>
                             <p class="table-desc">Update your in-world nickname, select from default avatars, or paste a link to your own.</p>
                         </td>
                         <td class="icon-column">
                             <div class="icons">
                                <i class="fa-solid fa-gear menu-icon"></i>
                             </div>
                         </td>
                    </tr>

                    <tr class="help-row" id="voicechat-row">
                        <td>
                            <p class="table-head">Voice Chat</p>
                            <p class="table-desc">Croquet Microverse sessions support <a href="https://dolby.io/products/voice-call/" class="dolby-link" target="_blank">Dolby.io Spatial Voice Call</a> technology for communicating using realistic spatial audio.
                            </p>
                        </td>
                        <td class="icon-column">
                            <div class="icons">
                                <img src="assets/images/2020_DolbyIO.png" class="dolby-img">
                            </div>
                        </td>
                    </tr>
                </table>
            </div>
        </div>
    </div>`.trim();

    let div = document.createElement("div");
    div.innerHTML = help;

    let helpMenu = div.querySelector("#helpDialog");
    let closeButton = helpMenu.querySelector("#close-button");

    filterDomEventsOn(helpMenu);

    closeButton.onclick = () => closeAllDialogs();

    if (simplerMenu) {
        ["manipulate-row", "import-row", "connect-row", "settings-row"].forEach(
            (n) => {
                let e = helpMenu.querySelector(`#${n}`);
                if (e) {
                    e.remove();
                }
            }
        );
    }

    document.body.appendChild(helpMenu);
}
