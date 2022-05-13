import { THREE, GetPawn } from "@croquet/worldcore";

import { CardActor, CardPawn } from "./DCard.js";
import { addShellListener, removeShellListener, sendToShell } from "./frame.js";


export class PortalActor extends CardActor {
    init(options) {
        super.init(options);
        this.listen("setResolvedPortalURL", this.setResolvedPortalURL);
    }

    get portalURL() { return this._cardData.portalURL; }

    get pawn() { return PortalPawn; }

    setResolvedPortalURL(portalURL) {
        // if multiple peers try to resolve the same portalURL,
        // we only accept the first one
        if (!this.resolvedPortalURL()) {
            this.setCardData({ portalURL });
        }
    }

    resolvedPortalURL() {
        // this is called from the pawn – must not modify!
        // a portalURL is resolved if it has session name and password
        const fakeBaseURL = "https://example.com/";
        const url = new URL(this.portalURL, fakeBaseURL);
        const searchParams = url.searchParams;
        const hashParams = new URLSearchParams(url.hash.slice(1));
        const sessionName = searchParams.get("q");
        const password = hashParams.get("pw");
        if (sessionName && password) return this.portalURL;
        return null;
    }
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

        this.listen("cardDataSet", () => {
            if (this.resolvePortalURLCallback) {
                const portalURL = this.actor.resolvedPortalURL();
                if (portalURL) {
                    this.resolvePortalURLCallback(portalURL);
                    this.resolvePortalURLCallback = null;
                }
            }
        });

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

        if (Array.isArray(obj.material)) {
            obj.material[0] = portalMaterial;
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

    async loadTargetWorld() {
        const portalURL = await this.resolvePortalURL();
        sendToShell("portal-load", {
            portalURL,
            portalId: this.portalId, // initially undefined
        });
    }

    async resolvePortalURL() {
        // if portalURL does not have a sessionName or password, we need to resolve it
        // we do this by asking the shell to resolve it because a frame might exist that
        // matches the portalURL and has a sessionName and password
        // however, we also need to use the same portal URL for all users
        // so after the shell resolved it, we send it to our actor
        // which will accept and broadcast only the first resolved URL
        const portalURL = this.actor.resolvedPortalURL();
        if (portalURL) return portalURL;
        return new Promise(resolve => {
            this.resolvePortalURLCallback = resolve;
            sendToShell("portal-resolve", { portalURL: this.actor.portalURL });
        });
    }

    enterPortal() {
        // NOTE THIS IS NOT THE ONLY CODE PATH FOR ENTERING WORLDS
        // we also jump between worlds using the browser's "forward/back" buttons
        console.log(this.viewId, "enter portal", this.portalId);
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
                if (this.actor.portalURL !== portalURL) {
                    console.log("portal URL changed from", this.actor.portalURL, "to", portalURL);
                    this.say("setCardData", { portalURL });
                }
                this.updatePortalCamera();
                break;
            case "frame-type":
                this.updatePortalCamera();
                break;
            case "portal-resolved":
                this.say("setResolvedPortalURL", portalURL);
                break;
        }
    }
}
