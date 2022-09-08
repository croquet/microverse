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

function savePressed(myAvatar) {
    let model = myAvatar.actor.wellKnownModel("ModelRoot");

    let div = document.createElement("a");

    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(model.saveData(), null, 4));

    div.setAttribute("href", dataStr);
    div.setAttribute("download", "scene.vrse");
    div.click();
    if (worldMenuVisible) {
        toggleMenu();
    }
}

function loadPressed(myAvatar) {
    if (!imageInput) {
        let input = document.createElement("div");
        input.innerHTML = `<input id="imageinput" type="file" accept="application/json;">`;
        imageInput = input.firstChild;

        imageInput.onchange = () => {
            for (const file of imageInput.files) {
                new Promise(resolve => {
                    let reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsBinaryString(file);
                }).then((data) => {
                    myAvatar.loadFromFile(data);
                })
            }
            imageInput.value = "";
        };
    }

    document.getElementById("hud").appendChild(imageInput);

    imageInput.click();
    if (worldMenuVisible) {
        toggleMenu();
    }
}

function connectPressed() {
    window.BehaviorViewManager.setURL("ws://localhost:9011");
    if (worldMenuVisible) {
        toggleMenu();
    }
}

function settingsPressed(myAvatar) {
    if (myAvatar) {
        myAvatar.showSettingsMenu();
        toggleMenu(myAvatar);
    }
}

function switchQRView(_myAvatar) {
    let qrDiv = worldMenu.querySelector("#qrDiv");
    let statsDiv = worldMenu.querySelector("#statsDiv");

    let cls = "statsHidden";

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
        toggleMenu();
    }
}

function initWorldMenu(badge) {
    let html = document.createElement("div");
    html.id = "worldMenu";
    html.classList.add("worldMenu");

    html.appendChild(badge);
    badge.id = "worldMenu-qr";
    badge.classList.add("menu-qr", "menu-item");

    let buttons = `
<div id="worldMenu-load" class="menu-label menu-item">
    <div class="menu-icon load-icon"></div>
    <span class="menu-label-text">Import</span>
</div>
<div id="worldMenu-save" class="menu-label menu-item">
    <div class="menu-icon save-icon"></div>
    <span class="menu-label-text">Export</span>
</div>
<div id="worldMenu-connect" class="menu-label menu-item">
    <div class="menu-icon connect-icon"></div>
    <span class="menu-label-text">Connect</span>
</div>
<div id="worldMenu-settings" class="menu-label menu-item">
    <div class="menu-icon save-icon"></div>
    <span class="menu-label-text">Settings</span>
</div>
<div id="fullscreenBttn" class="menu-label menu-item">
    <div class="menu-icon fullscreen-icon"></div>
    <span class="menu-label-text">Fullscreen</span>
</div>
</div>

`.trim();

    let div = document.createElement("div");
    div.innerHTML = buttons;

    let save = div.querySelector("#worldMenu-save");
    let load = div.querySelector("#worldMenu-load");
    let connect = div.querySelector("#worldMenu-connect");
    let fullscreen = div.querySelector("#fullscreenBttn");
    let settings = div.querySelector("#worldMenu-settings");

    html.appendChild(load);
    html.appendChild(save);
    html.appendChild(connect);
    html.appendChild(fullscreen);
    html.appendChild(settings);

    worldMenu = html;
    filterDomEventsOn(worldMenu);
    worldMenuVisible = false;
    document.getElementById("hud").appendChild(worldMenu);
}
//     let div;

//     div = worldMenu.querySelector("#fullscreenBttn");    
//     div.onclick = (e) => {
//     e.stopPropagation();
//     e.preventDefault();

//     if (e.shiftKey) {
//         document.body.classList.toggle("tilt");
//         return;
//     }

//     if (!document.fullscreenElement) {
//         // If the document is not in full screen mode
//         // make the document full screen
//         document.body.requestFullscreen();
//     } else {
//         // Otherwise exit the full screen
//         if (document.exitFullscreen) {
//             document.exitFullscreen();
//         }
//     }
// }


function toggleMenu(myAvatar) {
    if (worldMenuVisible) {
        worldMenu.classList.remove("menuVisible");
        worldMenuVisible = false;
        return;
    }

    if (worldMenu.lastChild.id === "worldMenu-forceStop") {
        worldMenu.lastChild.remove();
    }

    if (myAvatar.actor.service("PlayerManager").presentationMode) {
        let presentation = `
<div id="worldMenu-forceStop" class="menu-label menu-item">
    <span class="menu-label-text">Stop Presentation</span>
</div>`.trim();

        let div = document.createElement("div");
        div.innerHTML = presentation;
        worldMenu.appendChild(div.firstChild);
    }

    let div;
    
    div = worldMenu.querySelector("#fullscreenBttn");
    div.onclick = (e) => {
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
    }

    div = worldMenu.querySelector("#worldMenu-qr");
    div.onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();

        if (evt.shiftKey || isMobile) {
            switchQRView(myAvatar);
            return;
        }
        qrPressed(myAvatar, window.location);
    }

    div = worldMenu.querySelector("#worldMenu-save");
    div.onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        savePressed(myAvatar);
    }

    div = worldMenu.querySelector("#worldMenu-load");
    div.onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        loadPressed(myAvatar);
    }

    

    div = worldMenu.querySelector("#worldMenu-connect");
    div.onclick = () => connectPressed(myAvatar);

    div = worldMenu.querySelector("#worldMenu-settings");
    if (div) div.onclick = () => settingsPressed(myAvatar);

    div = worldMenu.querySelector("#worldMenu-forceStop");
    if (div) {
        div.onclick = () => forceStop(myAvatar);
    }

    worldMenuVisible = true;
    worldMenu.classList.add("menuVisible");
    return worldMenu;
}

export function setupWorldMenuButton(myAvatar, App, sessionId) {
    if (!worldMenu) {
        let ownerDiv = document.createElement("div");
        let statsDiv = document.createElement("div");
        statsDiv.id = "statsDiv";
        let qrDiv = document.createElement("div");
        qrDiv.id = "qrDiv";

        statsDiv.classList.add("statsHidden");

        ownerDiv.appendChild(qrDiv);
        ownerDiv.appendChild(statsDiv);

        App.root = ownerDiv;
        App.badge = false;
        App.qrcode = qrDiv;
        App.stats = statsDiv;
        App.makeSessionWidgets(sessionId);
        qrDiv.onclick = null;

        initWorldMenu(ownerDiv);
    }
    let worldMenuBttn = document.querySelector("#worldMenuBttn");
    worldMenuBttn.onclick = () => toggleMenu(myAvatar);
    filterDomEventsOn(worldMenuBttn);
}

export function filterDomEventsOn(elem) {
    elem.onpointerdown = (evt) => evt.stopPropagation();
    elem.onpointerup = (evt) => evt.stopPropagation();
    elem.onpointermove = (evt) => evt.stopPropagation();
}
