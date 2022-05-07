import { THREE, GetPawn } from "@croquet/worldcore";

import { CardActor, CardPawn } from "./DCard.js";
import { addShellListener, removeShellListener, sendToShell } from "./frame.js";


export class PortalActor extends CardActor {

    get targetURL() { return this._cardData.targetURL; }

    get pawn() {return PortalPawn;}

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
        sendToShell("load-world", {
            url: this.actor.targetURL,
            portalId: this.portalId, // initially undefined
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

    receiveFromShell(command, { portalId }) {
        switch (command) {
            case "portal-opened":
                this.portalId = portalId;
                this.updatePortalCamera();
                break;
            case "frame-type":
                this.updatePortalCamera();
                break
        }
    }
}
