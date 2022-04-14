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

        this.loadTargetWorld();
    }

    destroy() {
        if (this.iframe && this.iframe.parentNode) {
            this.iframe.parentNode.removeChild(this.iframe);
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

    loadTargetWorld() {
        const { targetURL } = this._actor._cardData;
        if (targetURL) {
            this.iframe = document.createElement("iframe");
            this.iframe.src = targetURL;
            this.iframe.style.width = "100%";
            this.iframe.style.height = "100%";
            document.body.appendChild(this.iframe);
        }
    }
}
