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
    <button id="close-button" type="button" class="btn btn-x topright"><i class="fa-solid fa-xmark"></i></button>
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
                             <p class="table-desc">run a dev server to link your text editor to edit behavior file code.</p>
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
                            <div class="icons"><!-- ./assets/images/2020_DolbyIO.png -->
                                <img src="data:image/png;base64,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" class="dolby-img">
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
