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

        console.log(this);
    }

    makePlaneMaterial(...args) {
        super.makePlaneMaterial(...args);

        // we're erasing the framebuffer (overwriting with 0,0,0,0)
        // glBlendFunc(GL_ZERO, GL_ZERO);

        this.material[0] = new THREE.MeshBasicMaterial({
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.ZeroFactor,
            blendDst: THREE.ZeroFactor,
        });

        return this.material;
    }

    // double-click should move avatar to the front of the portal
    get hitNormal() {
        return [0, 0, 1];
    }

}
