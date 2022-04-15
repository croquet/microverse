let worldMenu = null;
let imageInput = null;

function qrPressed(_myAvatar, url) {
    let div = document.createElement("div");
    div.innerHTML = `<a id="link" target="_blank" rel="noopener noreferrer" href="${url}"></a>`;
    document.body.appendChild(div);
    let a = div.querySelector("#link");
    a.click();
    div.remove();
    console.log("qr");
}

function savePressed(myAvatar) {
    let model = myAvatar.actor.wellKnownModel("ModelRoot");

    let div = document.createElement("a");

    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(model.saveData(), null, 4));

    div.setAttribute("href", dataStr);
    div.setAttribute("download", "scene.json");
    div.click();
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

    document.body.appendChild(imageInput);

    imageInput.click();
    console.log("load");
}

function connectPressed() {
    window.BehaviorViewManager.setURL("ws://localhost:9011");
}

function toggleMenu(myAvatar, qrCanvas) {
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

    let div;

    div = worldMenu.querySelector("#worldMenu-qr");
    div.onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        qrPressed(myAvatar, window.location);
    }
    div.appendChild(qrCanvas);

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

    document.body.appendChild(worldMenu);

    return worldMenu;
}

export function setupWorldMenuButton(myAvatar, qrCanvas) {
    let worldMenuButton = document.querySelector("#worldMenuBttn");
    worldMenuButton.onclick = () => toggleMenu(myAvatar, qrCanvas);
}
