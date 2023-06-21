import { sendToShell } from "./frame.js";

let worldMenu = null;
let worldMenuVisible = false;
let imageInput = null;

let isMobile = !!("ontouchstart" in window);

function qrPressed(_myAvatar, url) {
    let div = document.createElement("div");
    div.innerHTML = `<a id="link" target="_blank" rel="noopener noreferrer" href="${url}"></a>`;
    document.getElementById("hud").appendChild(div);
    let a = div.querySelector("#link");
    a.click();
    div.remove();
}

function loadPressed(myAvatar) {
    if (!imageInput) {
        let input = document.createElement("div");
        input.innerHTML = `<input id="imageinput" type="file" accept="application/json,image/*,.glb,.obj,.fbx,.wrl,.zip,.svg,.vrse,.exr,.pdf,.mp3,.wav">`;
        imageInput = input.firstChild;

        let getFileType = (fileName) => {
            let index = fileName.lastIndexOf(".");
            if (index >= 0) {
                return fileName.slice(index + 1).toLowerCase();
            }
            return null;
        };

        imageInput.onchange = () => {
            for (const file of imageInput.files) {
                let type = getFileType(file.name);

                new Promise((resolve) => {
                    let reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsArrayBuffer(file);
                }).then((data) => {
                    if (type === "vrse") {
                        myAvatar.loadvrse(data);
                    } else {
                        myAvatar.analyzeAndUploadFile(data, file.name, type);
                    }
                });
            }
            imageInput.value = "";
        };
    }

    document.getElementById("hud").appendChild(imageInput);

    imageInput.click();
    if (worldMenuVisible) {
        toggleMenu(myAvatar);
    }
}

export function connectFeedback(flag) {
    let connectButton = document.getElementById("connectBtn");
    let connectIcon = document.getElementById("connectIcon");

    if (flag) {
        connectButton.textContent = "Connected";
        connectButton.classList.add("connected");
        connectIcon.classList.remove("connect-icon");
        connectIcon.classList.add("connected-icon");
    } else {
        connectButton.textContent = "Connect";
        connectButton.classList.remove("connected");
        connectIcon.classList.add("connect-icon");
        connectIcon.classList.remove("connected-icon");
    }
}

function connectPressed(myAvatar) {
    let manager = myAvatar.service("BehaviorViewManager");

    if (manager) {
        manager.setURL("ws://localhost:9011", connectFeedback);
    }
}

function settingsPressed(myAvatar) {
    if (worldMenuVisible) {
        toggleMenu(myAvatar);
    }
    if (myAvatar) {
        myAvatar.showSettingsMenu();
    }
}

function sharePressed(myAvatar) {
    if (worldMenuVisible) {
        toggleMenu(myAvatar);
    }
    if (myAvatar) {
        myAvatar.showShareMenu();
    }
}

function helpPressed(myAvatar) {
    if (worldMenuVisible) {
        toggleMenu(myAvatar);
    }
    if (myAvatar) {
        myAvatar.showHelpMenu();
    }
}

function switchQRView(_myAvatar) {
    let qrDiv = worldMenu.querySelector("#qrDiv");
    let statsDiv = worldMenu.querySelector("#statsDiv");
    let innerDiv = statsDiv.querySelector("#innerDiv");
    let innderDivSecond = innerDiv.childNodes[1];

    let cls = "statsHidden";

    if (innderDivSecond) {
        innderDivSecond.classList.add(cls);
    }

    // workaround until I understand it more
    statsDiv.style.height = "176px";

    if (qrDiv.classList.contains(cls)) {
        qrDiv.classList.toggle(cls, false);
        statsDiv.classList.toggle(cls, true);
    } else {
        qrDiv.classList.toggle(cls, true);
        statsDiv.classList.toggle(cls, false);
    }
}

function forceStop(myAvatar) {
    myAvatar.say("stopPresentation");
    if (worldMenuVisible) {
        // toggleMenu(myAvatar);
    }
}

function initWorldMenu(badge) {
    let html = document.createElement("div");
    html.id = "worldMenu";
    html.classList.add("worldMenu");

    let buttons = `
<div id="worldMenu-load" class="menu-label menu-item">
    <i class="fas fa-solid fa-upload menu-icon"></i>
    <span class="menu-label-text">Import</span>
</div>
<div id="worldMenu-connect" class="menu-label menu-item">
    <i class="fas fa-solid fa-link menu-icon"></i>
    <span class="menu-label-text" id="connectBtn">Connect</span>
</div>
<div id="worldMenu-gather" class="menu-label menu-item">
    <i class="fas fa-solid fa-users menu-icon"></i>
    <span class="menu-label-text">Gather</span>
</div>
<div id="worldMenu-settings" class="menu-label menu-item">
    <i class="fas fa-solid fa-gear menu-icon"></i>
    <span class="menu-label-text">Settings</span>
</div>
<hr>
<div id="fullscreenBtn" class="menu-label menu-item">
    <i class="fas fa-solid fa-expand menu-icon"></i>
    <span class="menu-label-text">Fullscreen</span>
</div>


`.trim();
    let div = document.createElement("div");
    div.innerHTML = buttons;

    let load = div.querySelector("#worldMenu-load");
    let connect = div.querySelector("#worldMenu-connect");
    let settings = div.querySelector("#worldMenu-settings");
    let presentationMode = div.querySelector("#worldMenu-gather");
    let fullscreen = div.querySelector("#fullscreenBtn");

    html.appendChild(badge);
    badge.id = "worldMenu-qr";
    badge.classList.add("menu-qr", "menu-item");

    html.appendChild(load);
    html.appendChild(connect);
    html.appendChild(presentationMode);
    html.appendChild(fullscreen);
    html.appendChild(settings);

    worldMenu = html;

    if (fullscreen) {
        fullscreen.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (e.shiftKey) {
                document.body.classList.toggle("tilt");
                return;
            }

            if (!document.fullscreenElement) {
                // If the document is not in full screen mode
                // make the document full screen
                document.body.requestFullscreen();
            } else {
                // Otherwise exit the full screen
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        };
    }

    filterDomEventsOn(worldMenu);
    worldMenuVisible = false;
    document.getElementById("hud").appendChild(worldMenu);
}

function hudButtons(myAvatar) {
    const html = document.getElementById("control-panel");
    let buttons = `

            <div id="tooltip-container-home" class="tooltip-container">
                <p class="tooltip-text-home tooltip">home</p>
                <div id="homeBtn" class="btn btn-ui">
                    <i class="fas fa-regular fa-house"></i>
                </div>
            </div>

            <div id="tooltip-container-share" class="tooltip-container">
                <p class="tooltip-text-share tooltip"> share</p>
                <div id="worldMenu-shareButton" class="btn btn-ui">
                    <i class="fas fa-user-plus"></i>
                </div>
            </div>

            <div id="tooltip-container-menu" class="tooltip-container">
                <p class="tooltip-text-menu tooltip"> menu</p>
                <div id="worldMenuBtn" class="btn btn-ui"> 
                    <i class="fa fa-solid fa-bars no-pointer-events"></i>
                </div>
            </div>

            <div id="tooltip-container-help" class="tooltip-container">
                <p class="tooltip-text-help tooltip"> help</p>
                <div id="worldMenu-helpButton" class="btn btn-ui">
                    <i class="fas fa-question-circle"></i>
                </div>
            </div>


        `;

    let div = document.createElement("div");
    div.innerHTML = buttons;
    html.append(...div.children);

    div = document.querySelector("#worldMenu-shareButton");
    if (div)
        div.onclick = () => {
            sharePressed(myAvatar);
        };

    div = document.getElementById("worldMenu-helpButton");
    if (div) div.onclick = () => helpPressed(myAvatar);

    document.querySelector("#homeBtn").onclick = () => myAvatar.goHome();
    filterDomEventsOn(document.querySelector("#homeBtn"));

    const tooltipContainers = document.querySelectorAll('.tooltip-container');

    tooltipContainers.forEach(item => {
        let timeout;
        const button = item.querySelector(".btn-ui");
        const tooltip = item.querySelector(".tooltip");
        
        button.addEventListener('mouseover', () => {
            timeout = setTimeout(()=>{tooltip.style.display = "block"}, 1000);
        })

        button.addEventListener('mouseout', () =>{
            tooltip.style.display = "none";
            clearTimeout(timeout);
        })

    })
}

document.onkeydown = function (e) {
    if (e.key === "g") {
        console.log("here");
        if (myAvatar.actor.service("PlayerManager").presentationMode) {
            forceStop(myAvatar);
        } else {
            myAvatar.comeToMe();
        }
    }
};

function setMenuItems(myAvatar) {
    let gatherItem = worldMenu.querySelector("#worldMenu-gather");
    let label = gatherItem.querySelector("span");

    if (myAvatar.actor.service("PlayerManager").presentationMode) {
        label.textContent = "Stop Gathering";
    } else {
        label.textContent = "Gather";
    }

    let div;

    div = worldMenu.querySelector("#worldMenu-qr");
    div.onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();

        if (evt.shiftKey || isMobile) {
            switchQRView(myAvatar);
            return;
        }
        qrPressed(myAvatar, window.location);
    };

    div = worldMenu.querySelector("#worldMenu-load");
    div.onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        loadPressed(myAvatar);
    };

    div = worldMenu.querySelector("#worldMenu-connect");
    div.onclick = () => connectPressed(myAvatar);

    div = worldMenu.querySelector("#worldMenu-settings");
    if (div) div.onclick = () => settingsPressed(myAvatar);

    div = gatherItem;

    if (div) {
        div.onclick = () => {
            // toggleMenu(myAvatar);
            if (myAvatar.actor.service("PlayerManager").presentationMode) {
                forceStop(myAvatar);
            } else {
                myAvatar.comeToMe();
            }
        };
    }
}

function toggleMenu(myAvatar) {
    let worldMenuBtn = document.querySelector("#worldMenuBtn");

    closeAllDialogs();
    if (worldMenuVisible) {
        sendToShell("hud", { joystick: true, fullscreen: true });

        worldMenu.classList.remove("menuVisible");
        worldMenuBtn.classList.remove("menu-clicked", "help-clicked");
        worldMenuVisible = false;
        return;
    } else {
        sendToShell("hud", { joystick: false, fullscreen: false });

        const width = window.innerWidth;
        if (width <= 600) {
            worldMenuBtn.classList.add("help-clicked");
            console.log(width);
        } else if (width >= 601) {
            worldMenuBtn.classList.add("menu-clicked");
        }
    }

    setMenuItems(myAvatar);

    worldMenuVisible = true;
    worldMenu.classList.add("menuVisible");
}

export function updateWorldMenu(myAvatar) {
    if (!worldMenuVisible) {
        return;
    }
    setMenuItems(myAvatar);
}

export function setupWorldMenuButton(myAvatar, App, sessionId) {
    if (!worldMenu) {
        let badge = document.createElement("div");
        let statsDiv = document.createElement("div");
        statsDiv.id = "statsDiv";
        let qrDiv = document.createElement("div");
        qrDiv.id = "qrDiv";

        statsDiv.classList.add("statsHidden");

        badge.appendChild(qrDiv);
        badge.appendChild(statsDiv);

        App.root = badge;
        App.badge = false;
        App.qrcode = qrDiv;
        App.stats = statsDiv;
        App.makeSessionWidgets(sessionId);
        qrDiv.onclick = null;

        initWorldMenu(badge);
        hudButtons(myAvatar);
    }
    let worldMenuBtn = document.querySelector("#worldMenuBtn");

    worldMenuBtn.onclick = () => toggleMenu(myAvatar);
    filterDomEventsOn(worldMenuBtn);
}

export function filterDomEventsOn(elem) {
    elem.onpointerdown = (evt) => evt.stopPropagation();
    elem.onpointerup = (evt) => evt.stopPropagation();
    elem.onpointermove = (evt) => evt.stopPropagation();
    elem.onwheel = (evt) => evt.stopPropagation();
}

export function closeAllDialogs() {
    let panels = document.querySelectorAll(".dialogPanel");
    const shareButton = document.getElementById("worldMenu-shareButton");
    const helpButton = document.getElementById("worldMenu-helpButton");

    panels.forEach((p) => p.remove());
    sendToShell("hud", { joystick: true, fullscreen: true });

    if (shareButton) {
        shareButton.classList.remove("share-clicked", "help-clicked");
    }
    if (helpButton) {
        helpButton.classList.remove("help-clicked");
    }
}

export function hideShellControls() {
    sendToShell("hud", { joystick: false, fullscreen: false });
    let homeBtn = document.querySelector("#homeBtn");
    if (homeBtn) {
        homeBtn.style.display = "none";
    }
}

export function loadCSS() {
    if (!document.head.querySelector("#settings-css")) {
        return new Promise((resolve, reject) => {
            let root = window.microverseDir ? window.microverseDir : "./";
            let css = document.createElement("link");
            css.rel = "stylesheet";
            css.type = "text/css";
            css.id = "settings-css";
            css.href = root + "assets/css/settings.css";
            css.onload = resolve;
            css.onerror = reject;
            document.head.appendChild(css);
        });
    }
    return Promise.resolve(true);
}

loadCSS();
