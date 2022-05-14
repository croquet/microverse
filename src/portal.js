import { THREE, GetPawn } from "@croquet/worldcore";

import { CardActor, CardPawn } from "./DCard.js";
import { addShellListener, removeShellListener, sendToShell, frameId } from "./frame.js";


export class PortalActor extends CardActor {
    get portalURL() { return this._cardData.portalURL; }

    get pawn() { return PortalPawn; }
}
PortalActor.register("PortalActor");

export class PortalPawn extends CardPawn {
    constructor(actor) {
        super(actor);


        this.portalId = undefined;
        this.targetMatrix = new THREE.Matrix4();
        this.targetMatrixBefore = new THREE.Matrix4();
        this.loadTargetWorld();

        this.addEventListener("pointerDown", "nop");
        this.addEventListener("keyDown", e => e.key === " " && this.enterPortal());

        this.shellListener = (command, data) => this.receiveFromShell(command, data);
        addShellListener(this.shellListener);
    }

    destroy() {
        removeShellListener(this.shellListener);
        super.destroy();
    }

    objectCreated(obj, options) {
        super.objectCreated(obj, options);
        this.applyPortalMateria(obj);
    }

    applyPortalMateria(obj) {
        if (!obj.material) obj = obj.children[0];

        // we're erasing the framebuffer (overwriting with 0,0,0,0)
        // glBlendFunc(GL_ZERO, GL_ZERO);

        const portalMaterial = new THREE.MeshBasicMaterial({
            blending: THREE.CustomBlending,
            blendSrc: THREE.ZeroFactor,
            blendDst: THREE.ZeroFactor,
        });
        portalMaterial.side = THREE.BackSide;

        if (Array.isArray(obj.material)) {
            obj.material[0] = portalMaterial;
            for (let i = 1; i < obj.material.length; i++) {
                obj.material[i].side = THREE.BackSide;
            }
        } else {
            obj.material = portalMaterial;
        }
    }

    // double-click should move avatar to the front of the portal
    get hitNormal() {
        return [0, 0, 1];
    }

    update() {
        super.update();
        this.updatePortalCamera();
    }

    updatePortalCamera() {
        if (!this.portalId) return;
        const { targetMatrix, targetMatrixBefore, portalId } = this;
        targetMatrix.copy(this.renderObject.matrixWorld);
        targetMatrix.invert();
        targetMatrix.multiply(this.service("ThreeRenderManager").camera.matrixWorld);
        if (!targetMatrixBefore.equals(targetMatrix)) {
            sendToShell("portal-update", { portalId, cameraMatrix: targetMatrix.elements });
            targetMatrixBefore.copy(targetMatrix);
        }
    }

    updateShape(options) {
        super.updateShape(options);
        this.loadTargetWorld();
    }

    cardDataUpdated(data) {
        super.cardDataUpdated(data);
        this.loadTargetWorld();
    }

    loadTargetWorld() {
        const portalURL = this.resolvePortalURL();
        sendToShell("portal-load", {
            portalURL,
            portalId: this.portalId, // initially undefined
        });
    }

    resolvePortalURL() {
        // if portalURL does not have a sessionName or password, we need to resolve it
        // we do this by appending our own sessionName and password to the URL
        let portalURL = this.actor.portalURL;
        const fakeBase = "https://example.com/";
        const portalTempUrl = new URL(portalURL, fakeBase);
        const portalSearchParams = portalTempUrl.searchParams;
        const portalHashParams = new URLSearchParams(portalTempUrl.hash.slice(1));
        let sessionName = portalSearchParams.get("q");
        let password = portalHashParams.get("pw");
        if (!sessionName || !password) {
            const worldUrl = new URL(location.href);
            if (!sessionName) {
                sessionName = worldUrl.searchParams.get("q");
                password = '';
                portalSearchParams.set("q", sessionName);
            }
            if (!password) {
                const worldHashParams = new URLSearchParams(worldUrl.hash.slice(1));
                password = worldHashParams.get("pw");
                portalHashParams.set("pw", password);
                portalTempUrl.hash = portalHashParams.toString();
            }
            portalURL = portalTempUrl.toString();
            if (portalURL.startsWith(fakeBase)) {
                portalURL = portalURL.slice(fakeBase.length);
            }
            this.say("setCardData", { portalURL });
        }
        return portalURL;
    }

    enterPortal() {
        // NOTE THIS IS NOT THE ONLY CODE PATH FOR ENTERING WORLDS
        // we also jump between worlds using the browser's "forward/back" buttons
        console.log(frameId, "player", this.viewId, "enter portal", this.portalId);
        const avatarActor = this.actor.service("PlayerManager").player(this.viewId);
        const avatarPawn = GetPawn(avatarActor.id);
        const avatarSpec = avatarPawn.specForPortal(this);
        sendToShell("portal-enter", { portalId: this.portalId, avatarSpec });
        // shell will swap iframes and trigger avatarPawn.frameTypeChanged() for this user in both worlds
    }

    receiveFromShell(command, { portalId, portalURL }) {
        switch (command) {
            case "portal-opened":
                this.portalId = portalId;
                if (this.actor.portalURL !== portalURL) this.say("setCardData", { portalURL });
                this.updatePortalCamera();
                break;
            case "frame-type":
                this.updatePortalCamera();
                break;
        }
    }
}
