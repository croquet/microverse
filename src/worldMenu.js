let worldMenu = null;

function qrPressed(evt) {
    console.log("qr");
}

function savePressed(evt) {
    console.log("save");
}

function loadPressed(evt) {
    console.log("load");
}

function connectPressed(evt) {
    console.log("connect");
}

function toggleMenu() {
    if (worldMenu) {
        worldMenu.remove();
        worldMenu = null;
        return null;
    }

    let html = `
<div id="worldMenu", class="worldMenu">
    <div id="worldMenu-qr" class="menu-qr menu-item"></div>
    <div id="worldMenu-save" class="menu-label menu-item">
       <span class="menu-label-text">Save</span>
       <div class="menu-icon save-icon"></div>
    </div>
    <div id="worldMenu-load" class="menu-label menu-item">
       <span class="menu-label-text">Load</span>
       <div class="menu-icon load-icon"></div>
    </div>
    <div id="worldMenu-connect" class="menu-label menu-item">
       <span class="menu-label-text">Connect</span>
       <div class="menu-icon connect-icon"></div>
    </div>
</div>`;

    let dom = document.createElement("div");
    dom.innerHTML = html;
    worldMenu = dom.querySelector("#worldMenu");
    document.body.appendChild(worldMenu);
    
    return worldMenu;
}

export function setupWorldMenuButton() {
    let worldMenuButton = document.querySelector("#worldMenuBttn");
    worldMenuButton.onclick = toggleMenu;
}
