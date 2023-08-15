// turn a card into a clickable link that will launch another web page
// Copyright 2022 Croquet Corporation

// the following import statement is solely for the type checking and
// autocompletion features in IDE.  A Behavior cannot inherit from
// another behavior or a base class but can use the methods and
// properties of the card to which it is installed.
// The prototype classes ActorBehavior and PawnBehavior provide
// the features defined at the card object.

import {PawnBehavior} from "../PrototypeBehavior";

class URLPawn extends PawnBehavior {
    setup() {
        this.addEventListener("pointerTap", "tap");
        this.addEventListener("pointerEnter", "enter");
        this.addEventListener("pointerLeave", "leave");
        this.addEventListener("pointerMove", "move");
        this.listen("selectEdit", "leave");
    }

    tap() {
        console.log("Did I tap tap tap tap?");
        let div = document.createElement("div");
        let url = this.actor._cardData.cardURL || "https://croquet.io"; // default to Croquet
        console.log(url);
        div.innerHTML = `<a id="link" target="_blank" rel="noopener noreferrer" href="${url}"></a>`;
        let a = div.querySelector("#link");
        a.click();
        div.remove();
    }

    enter() {
        let hilite = this.actor._cardData.cardHilite || 0xffaaa;
        this.doHilite(hilite);
        if(this.interval)this.leave();
        this.interval = setInterval(() => this.leave(), 10000);
    }

    leave() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = undefined;
        }
        this.doHilite(null);
    }

    move() {
        console.log("moving")
    }

    doHilite(hval) {
        this.shape.traverse((m) => {
            if (m.material) {
                if (!Array.isArray(m.material)) {
                    this.setColor(m.material, hval);
                } else {
                    m.material.forEach((mm) => this.setColor(mm, hval));
                }
            }
        });
    }

    setColor(material, color) {
        if(!material.saveColor)material.saveColor = material.color;
        if(color) {
            material.color = new Microverse.THREE.Color(color);
        } else {
            material.color = material.saveColor;
        }
    }

    teardown() {
        this.removeEventListener("pointerTap", "tap");
        this.removeEventListener("pointerEnter", "enter");
        this.removeEventListener("pointerLeave", "leave");
        this.removeEventListener("pointerMove", "move");
    }
}

export default {
    modules: [
        {
            name: "URLLink",
            pawnBehaviors: [URLPawn]
        }
    ]
}

/* globals Microverse */