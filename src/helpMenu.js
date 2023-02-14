// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import {filterDomEventsOn, closeAllDialogs, hideShellControls} from "./hud.js";

let simplerMenu;

export function startHelpMenu(simplerMenuFlag) {
    simplerMenu = simplerMenuFlag;
    closeAllDialogs();
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
                                <p class="table-desc">Move around using the joystick, or WASD keys.</p>
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
                            <p class="table-desc">Ctrl + click on an object to open and cycle through the "gizmo" tools. The icon of a multi-pane tool is a button to open the property sheet tool.</p>
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
                        <td class="icon-column"><i class="fas fa-solid fa-house-user icons"></i></td>
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
                            <p class="table-desc">Import any of these formats from your desktop directly
                                 into the Microverse World. Either drag and drop, or choose the import menu item.</p>
                        </td>
                        <td class="icon-column">
                            <div class="icons">
                                <div class="help-pane-icon import-icon help-menu-icon"></div>
                            </div>
                        </td>
                     </tr>
                     <tr class="help-row" id="connect-row">
                         <td>
                             <p class="table-head">Connect</p>
                             <p class="table-desc">Click connect to link your text editor to edit behavior files.</p>
                         </td>
                         <td class="icon-column">
                             <div class="icons">
                                 <div class="help-pane-icon connect-icon help-menu-icon"</div>
                             </div>
                         </td>
                     </tr>
                     <tr class="help-row">
                         <td>
                             <p class="table-head">Invite</p>
                             <p class="table-desc">Save your Microverse as a .vrse file to share or use the QR code to share the session with others.</p>
                         </td>
                         <td class="icon-column">
                             <div class="icons">
                                 <div class="help-pane-icon share-icon help-menu-icon"></div>
                             </div>
                         </td>
                     </tr>
                     <tr class="help-row" id="settings-row">
                         <td>
                             <p class="table-head">Settings</p>
                             <p class="table-desc">Update your in-world nickname, select from default avatars or paste a link to your own.</p>
                         </td>
                         <td class="icon-column">
                             <div class="icons">
                                 <div class="help-pane-icon settings-icon help-menu-icon"></div>
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
        ["manipulate-row", "import-row", "connect-row", "settings-row"].forEach((n) => {
            let e = helpMenu.querySelector(`#${n}`);
            if (e) {
                e.remove();
            }
        });
    }

    document.body.appendChild(helpMenu);
}
