import { THREE } from "@croquet/worldcore";

import { CardActor, CardPawn } from "./DCard.js";

export class PortalActor extends CardActor {
    init(options) {
        super.init(options);
    }

    get targetURL() { return this._cardData.targetURL; }

    get pawn() {return PortalPawn;}

}

PortalActor.register("PortalActor");

export class PortalPawn extends CardPawn {
    constructor(actor) {
        super(actor);

        // create listener for messages from shell
        this.shellListener = e => {
            if (e.source === window.parent && e.data.message?.startsWith("croquet:microverse:")) {
                this.receiveFromShell(e.data);
            }
        }
        window.addEventListener("message", this.shellListener);

        this.portalId = undefined;
        this.targetMatrix = new THREE.Matrix4();
        this.targetMatrixBefore = new THREE.Matrix4();
        this.loadTargetWorld();

        this.addEventListener("pointerDown", "nop");
        this.addEventListener("keyDown", e => e.key === " " && this.enterPortal());
    }

    destroy() {
        window.removeEventListener("message", this.shellListener);
    }

    makePlaneMaterial(...args) {
        super.makePlaneMaterial(...args);

        // we're erasing the framebuffer (overwriting with 0,0,0,0)
        // glBlendFunc(GL_ZERO, GL_ZERO);

        this.material[0] = new THREE.MeshBasicMaterial({
            blending: THREE.CustomBlending,
            blendSrc: THREE.ZeroFactor,
            blendDst: THREE.ZeroFactor,
        });

        return this.material;
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
            this.sendToShell({message: "croquet:microverse:portal-update", portalId, cameraMatrix: targetMatrix.elements});
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
        this.sendToShell({
            message: "croquet:microverse:load-world",
            url: this.actor.targetURL,
            portalId: this.portalId, // initially undefined
        });
    }

    enterPortal() {
        console.log(this.viewId, "enter portal", this.portalId);
        this.sendToShell({message: "croquet:microverse:portal-enter", portalId: this.portalId});
    }

    receiveFromShell(data) {
        switch (data.message) {
            case "croquet:microverse:portal-opened":
                this.portalId = data.portalId;
                this.updatePortalCamera();
                break;
            case "croquet:microverse:window-type":
                this.updatePortalCamera();
                break
        }
    }

    sendToShell(data) {
        window.parent.postMessage(data, "*");
    }
}
