// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { AM_Elected, PM_Elected} from "../src/DElected.js";
import { CardActor, CardPawn } from '../src/DCard.js';
import { THREE, mix } from "@croquet/worldcore";
import earthbase from "../assets/images/earthbase.png";
import earthshadow from "../assets/images/earthshadow.jpg";

const SHADOWRADIUS = 3.95; // size of the earth (water)
const BASERADIUS = 4;      // size of the earth (land)

export class FlightTracker extends mix(CardActor).with(AM_Elected){
    get pawn() {return FlightDisplay;}
    init(options){
        super.init(options);
        this.listen("FlightUpdate", this.flightUpdate);
    }

    flightUpdate(flightData){
        this.flightData = flightData;
        this.sayDeck("updateFlight");
    }
}

FlightTracker.register("FlightTracker");

class FlightDisplay extends mix(CardPawn).with(PM_Elected){
    constructor(actor){
        super(actor);
        this.listenDeck("updateFlight", this.updateFlight);
        this.constructEarth();
    }

    constructEarth(){
        this.earth = new THREE.Group();
            // Create the earth
        const earthBaseTexture = new THREE.TextureLoader().load( earthbase );
        earthBaseTexture.wrapS = earthBaseTexture.wrapT = THREE.RepeatWrapping;
        earthBaseTexture.repeat.set(1,1);

        const earthShadowTexture = new THREE.TextureLoader().load( earthshadow );
        earthShadowTexture.wrapS = earthShadowTexture.wrapT = THREE.RepeatWrapping;
        earthShadowTexture.repeat.set(1,1);

        const shadowSphere = new THREE.Mesh(
            new THREE.SphereGeometry(SHADOWRADIUS, 64, 64),
            new THREE.MeshStandardMaterial({ map: earthShadowTexture, color: this.actor._color, roughness: 0.7, opacity:0.9, transparent: true }));
        this.earth.add(shadowSphere);

        const  baseSphere = new THREE.Mesh(
            new THREE.SphereGeometry(BASERADIUS, 64, 64),
            new THREE.MeshStandardMaterial({ alphaMap: earthBaseTexture, color: this.actor_color, roughness: 0.7, opacity:0.9, transparent: true }));
        this.earth.add(baseSphere);

        this.setRenderObject( this.earth );
    }

    updateFlight(){

    }
}