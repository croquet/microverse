class SynchronousCardLoaderPawn {
    setup() {
        this.subscribe(this.sessionId, "synchronousLoadCardsStarted", "synchronousLoadCardsStarted");
        this.subscribe(this.sessionId, "allSynnchronousCardsLoaded", "allSynnchronousCardsLoaded");

        let viewRoot = Microverse.getViewRoot();
        if (viewRoot.notLoadedSynchronousCards) {
            this.publish(this.sessionId, "synchronousLoadCardsStarted");
        }
    }

    synchronousLoadCardsStarted() {
        console.log("synchronousLoadCardsStarted");
        let initialCoverDiv = document.createElement("div");
        initialCoverDiv.style.position = "fixed";
        initialCoverDiv.style.width = "100%";
        initialCoverDiv.style.height = "100%";
        initialCoverDiv.style.zIndex = 2000;
        initialCoverDiv.style.backgroundColor = "#000000E8";
        window.initialCoverDiv = initialCoverDiv;
        document.body.appendChild(initialCoverDiv);
        Microverse.sendToShell("hud", {joystick: false, fullscreen: false});
    }

    allSynnchronousCardsLoaded() {
        console.log("allSynnchronousCardsLoaded");
        if (window.initialCoverDiv) {
            window.initialCoverDiv.remove();
            delete window.initialCoverDiv;
        }
        Microverse.sendToShell("hud", {joystick: true, fullscreen: true});
    }
}

export default {
    modules: [
        {
            name: "SynchronousCardLoader",
            pawnBehaviors: [SynchronousCardLoaderPawn]
        }
    ]
}

/* globals Microverse */
