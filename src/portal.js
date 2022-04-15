import { THREE } from "@croquet/worldcore";

import { CardActor, CardPawn } from "./DCard.js";

export class PortalActor extends CardActor {
    init(options) {
        super.init(options);
   }

    get pawn() {return PortalPawn;}

}

PortalActor.register("PortalActor");

export class PortalPawn extends CardPawn {
    constructor(actor) {
        super(actor);

        // create checkerboard pattern for portal testing
        document.body.style.background = "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 100px 100px";

        // let inner world shine through like a ghost
        document.getElementById("ThreeCanvas").style.opacity = 0.9;

        this.targetMatrix = new THREE.Matrix4();
        this.targetMatrixBefore = new THREE.Matrix4();
        this.loadTargetWorld();
    }

    destroy() {
        if (this.iframe) {
            if (this.iframe.parentNode) this.iframe.parentNode.removeChild(this.iframe);
            this.iframe = null;
        }
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
        this.targetMatrix.copy(this.renderObject.matrixWorld);
        this.targetMatrix.invert();
        this.targetMatrix.multiply(this.service("ThreeRenderManager").camera.matrixWorld);
        if (!this.targetMatrixBefore.equals(this.targetMatrix)) {
            this.sendToIframe({message: "croquet:microverse:portal", cameraMatrix: this.targetMatrix.elements});
            this.targetMatrixBefore.copy(this.targetMatrix);
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
        const { targetURL } = this._actor._cardData;
        if (!this.iframe) {
            // create inner-world iframe
            this.iframe = document.createElement("iframe");
            this.iframe.style.width = "100%";
            this.iframe.style.height = "100%";
            document.body.appendChild(this.iframe);
        }
        this.iframe.src = targetURL;
    }

    sendToIframe(data) {
        this.iframe.contentWindow.postMessage(data, "*");
    }
}
