// Menus
// Croquet Microverse

class MenuActor {
    setup() {
    }
}

class MenuPawn {
    setup(){
        if(this.menuItems)this.teardown();
        this.menuItems = [];
        this.installMenu("Code on Github", "./assets/images/github.png", ()=>this.linkTo("https://github.com/croquet/physics"));
    }

    linkTo(url) {
        let div = document.createElement("div");
        url = url || "https://croquet.io"; // default to Croquet
        div.innerHTML = `<a id="link" target="_blank" rel="noopener noreferrer" href="${url}"></a>`;
        let a = div.querySelector("#link");
        a.click();
        div.remove();
    }

    installMenu(menuText, menuImage, callback){
        let menu = document.body.querySelector("#worldMenu");
        if (menu) {
            let menuItemDiv = document.createElement("div");
            menuItemDiv.innerHTML = 
                `<div id="worldMenu-foo" class="menu-label menu-item">
                <span class="menu-label-text">${menuText}</span>
                <div class="menu-icon"></div>
                </div>`;
            let menuItem = menuItemDiv.firstChild;
            if (menuImage) {
                let menuIcon = menuItem.querySelector(".menu-icon");
                menuIcon.style.setProperty("background-image", `url(${menuImage})`);
                menuIcon.style.setProperty("background-size", "contain");
            }
            menuItem.addEventListener("click", callback);
            menu.appendChild(menuItem);

            this.menuItems.push(menuItem); // needs to be an array
        }   
    }

    teardown() {
        this.menuItems.forEach( m=>m.remove());
        this.menuItems = [];
    }
}


export default {
    modules: [
        {
            name: "Menus",
            actorBehaviors: [MenuActor],
            pawnBehaviors: [MenuPawn],
        }
    ]
}
