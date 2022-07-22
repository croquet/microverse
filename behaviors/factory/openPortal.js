class OpenArtGalleryPortalActor {
    setup() {
        this.addEventListener("pointerTap", "pressed");
    }

    check() {
        let cards = this.queryCards({methodName: "isPortal"}, this);
        this.hasOpened = cards.length > 0;
    }

    isPortal(card) {
        return card.layers.includes("portal");
    }

    pressed() {
        this.check();
        if (this.hasOpened) {return;}
        this.hasOpened = true;

        this.createCard({
            translation: [0, 4.1, 39],
            rotation: [0, 0, 0],
            layers: ["pointer"],
            className: "PortalActor",
            color: 0xFF66CC,
            cornerRadius: 0.05,
            depth: 0.05,
            frameColor: 8947848,
            portalURL: "?world=default",
            type: "2d",
            width: 1.8,
            height: 2.4,
        });
        this.say("portalChanged");
    }
}

class OpenArtGalleryPortalPawn {
    setup() {
        this.addEventListener("pointerMove", "nop");
        this.addEventListener("pointerEnter", "hilite");
        this.addEventListener("pointerLeave", "unhilite");
        this.makeButton();
        this.listen("portalChanged", "setScale");
    }

    setScale() {
        let scale = !this.actor.hasOpened
            ? (this.entered ? 1.3 : 1.2)
            : 1.2;

        if (this.shape.children[0]) {
            this.shape.children[0].scale.set(scale, scale, scale);
        }
    }

    makeButton() {
        this.setScale();
    }

    hilite() {
        this.entered = true;
        this.setScale();
    }

    unhilite() {
        this.entered = false;
        this.setScale();
    }
}

export default {
    modules: [
        {
            name: "OpenArtGalleryPortalButton",
            actorBehaviors: [OpenArtGalleryPortalActor],
            pawnBehaviors: [OpenArtGalleryPortalPawn]
        }
    ]
}
