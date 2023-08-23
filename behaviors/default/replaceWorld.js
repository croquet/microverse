// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

class ReplaceWorldPawn {

    get targetURL() { return this.actor._cardData.replaceWorldTargetURL; }
    set targetURL(url) { if (this.targetURL !== url) this.say("setCardData", { replaceWorldTargetURL: url }); }
    get preserveOrigin() { return this.actor._cardData.replaceWorldPreserveOrigin; }

    setup() {
        this.addEventListener("pointerDown", "onPointerDown");
    }

    onPointerDown() {
        document.body.style.background = "black";
        const canvas = document.getElementById("ThreeCanvas");
        canvas.style.transition = "opacity 1s";
        canvas.style.opacity = 0;
        const targetURL = this.resolveTargetURL();
        setTimeout(() => {
            if (window.microverseEnablePortal) {
                Microverse.sendToShell("world-replace", { targetURL});
            } else {
                window.location.replace(targetURL);
            }
        }, 1000);
    }

    resolveTargetURL() {
        // if targetURL does not have a sessionName or password, we need to resolve it
        // we do this by appending our own sessionName and password to the URL
        const our = new URL(location.href);
        const target = new URL(this.targetURL, our.href);
        const targetSearchParams = target.searchParams;
        const targetHashParams = new URLSearchParams(target.hash.slice(1));
        // if the target has a sessionName or password, we don't need to resolve it
        let sessionName = targetSearchParams.get("q");
        let password = targetHashParams.get("pw");
        if (!sessionName || !password) {
            if (!sessionName) {
                sessionName = our.searchParams.get("q");
                password = '';
                targetSearchParams.set("q", sessionName);
            }
            if (!password) {
                const ourHashParams = new URLSearchParams(our.hash.slice(1));
                password = ourHashParams.get("pw");
                targetHashParams.set("pw", password);
                target.hash = targetHashParams.toString();
            }
        }
        // copy our options to the target
        for (const setting of [ "showSettings", "voiceChat", "broadcastMode" ]) {
            if (our.searchParams.has(setting)) targetSearchParams.set(setting, "true");
        }
        // stay on the origin if we are running there
        if (this.preserveOrigin && new RegExp(this.preserveOrigin).test(our.origin)) {
            // use our own origin as target origin
            target.protocol = our.protocol;
            target.host = our.host;
            // append target path to ours. this is designed to work both on /dev/ and /
            const targetPath = target.pathname.split("/"); // ["", "dir", "to", "target", "x.html"]
            targetPath.shift(); // ["dir", "to", "target", "x.html"]
            const ourPath = our.pathname.split("/"); // ["", "dev", "myapp", "y.html"]
            ourPath.splice(-2); // ["", "dev"]
            ourPath.push(...targetPath); // ["", "dev", "dir", "to", "target", "x.html"]
            target.pathname = ourPath.join("/"); // "/dev/dir/to/target/x.html"
        }
        // return the resolved URL
        return target.href;
    }

}

export default {
    modules: [
        {
            name: "ReplaceWorld",
            actorBehaviors: [],
            pawnBehaviors: [ReplaceWorldPawn],
        },
    ]
}
