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

        // this.geometry = new THREE.PlaneGeometry(1, 1);
        // this.material = new THREE.Material(...);
        // this.mesh = new THREE.Mesh(this.geometry, this.material);

        console.log(this);
    }

    destroy() {
        // this.geometry.dispose();
        // this.material.dispose();
        super.destroy();
    }

    // double-click should move avatar to the front of the portal
    get hitNormal() {
        return [0, 0, 1];
    }

}
