// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { AM_Elected, PM_Elected} from "../src/DElected.js";
import { CardActor, CardPawn } from '../src/DCard.js';
import { THREE, mix, q_euler, q_multiply } from "@croquet/worldcore";
import earthbase from "../assets/images/earthbase.png";
import earthshadow from "../assets/images/earthshadow.jpg";

const SHADOWRADIUS = 3.95; // size of the earth (water)
const BASERADIUS = 4;      // size of the earth (land)

export class FlightTracker extends mix(CardActor).with(AM_Elected){
    get pawn() {return FlightDisplay;}
    init(options){
        super.init(options);
        this.listen("FlightUpdate", this.flightUpdate);
        this.listen("startSpinning", this.startSpinning);
        this.listen("stopSpinning", this.stopSpinning);
    }

    startSpinning(spin){
        this.isSpinning = true;
        this.qSpin = q_euler(0,spin,0);
        this.doSpin();
    }

    doSpin(){
        if(this.isSpinning){
            this.setRotation(q_multiply(this._rotation, this.qSpin));
            this.future(50).doSpin();
        }
    }

    stopSpinning(){
        this.isSpinning = false;
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
        this.addEventListener("pointerDown", "onPointerDown");
        this.addEventListener("pointerUp", "onPointerUp");
        this.addEventListener("pointerEnter", "onPointerEnter");
        this.addEventListener("pointerLeave", "onPointerLeave");
        this.addEventListener("pointerMove", "onPointerMove");
    }

    constructEarth(){
        // Create the earth
        const earthBaseTexture = new THREE.TextureLoader().load( earthbase );
        earthBaseTexture.wrapS = earthBaseTexture.wrapT = THREE.RepeatWrapping;
        earthBaseTexture.repeat.set(1,1);

        const earthShadowTexture = new THREE.TextureLoader().load( earthshadow );
        earthShadowTexture.wrapS = earthShadowTexture.wrapT = THREE.RepeatWrapping;
        earthShadowTexture.repeat.set(1,1);

        this.shadowSphere = new THREE.Mesh(
            new THREE.SphereGeometry(SHADOWRADIUS, 64, 64),
            new THREE.MeshStandardMaterial({ map: earthShadowTexture, color: this.actor._color, roughness: 0.7, opacity:0.9, transparent: true }));
            this.shadowSphere.receiveShadow = true;
        this.shape.add(this.shadowSphere);

        this.baseSphere = new THREE.Mesh(
            new THREE.SphereGeometry(BASERADIUS, 64, 64),
            new THREE.MeshStandardMaterial({ alphaMap: earthBaseTexture, color: 0x44ff44, roughness: 0.7, opacity:0.9, transparent: true }));
        this.baseSphere.receiveShadow = true;
        this.baseSphere.castShadow = true;
        this.shape.add(this.baseSphere);
    }

    updateFlight(){

    }

    theta(xyz){
        let local = this.world2local(xyz);
        return Math.atan2(local[0],local[2]);
    }

    onPointerDown(p3d){
        this._plane = true;
        this.base = this.theta(p3d.xyz);
        this.deltaAngle = 0;
        this.say("stopSpinning");
    }

    onPointerMove(p3d) {
        let next = this.theta(p3d.xyz);
        this.deltaAngle = (next - this.base)/2;
        let qAngle = q_euler(0,this.deltaAngle,0);
        this.setRotation(q_multiply(this._rotation, qAngle));
    }

    onPointerUp(p3d){
        if(p3d.xyz){ // clean up and see if we can spin
            this.onPointerMove(p3d);
            if(Math.abs(this.deltaAngle)>0.001)
                this.say("startSpinning", this.deltaAngle);
        }
        this._plane = false;
    }

    onPointerEnter(p3d){
        this.shadowSphere.material.emissive = new THREE.Color(0x4444ff);
    }

    onPointerLeave(p3d){
        this.shadowSphere.material.emissive = new THREE.Color(0);
    }
}