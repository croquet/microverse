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
        this.listen("flightUpdate", this.flightUpdate);
        this.listen("startSpinning", this.startSpinning);
        this.listen("stopSpinning", this.stopSpinning);
        this.listen("processFlight", this.processFlight);
        this.planes = new Map();
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

    flightUpdate(flightData){      // addarray data to map
        this.flightData = flightData;
        this.sayDeck("updateFlight");
    }

    processFlight(){ //completed the map, now GC and inform view

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
        this.rawPlanes=[];
        this.chunkSize = 100; //number of plane records to send
        this.processFlight();
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

    processFlight(){
        let len = this.rawPlanes.length;
        let nextTime =100;
        if(len===0){
            if(!this.gettingFlight)this.getFlight();
        }else{ //send the rawPlanes data to model
            let sendArray = this.rawPlanes.slice(this.sendex, Math.min(len, this.sendex+this.chunkSize))
            this.say("flightUpdate", sendArray);
            this.sendex += this.chunkSize;
            if(this.sendex>len){
                this.rawPlanes = [];
                this.say("processFlight");
                nextTime = 5000;
            }
        }
        this.future(nextTime).processFlight();
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
            if(Math.abs(this.deltaAngle)>0.001){
                let a = this.deltaAngle;
                a = Math.min(Math.max(-0.1, a), 0.1);
                this.say("startSpinning", a);
            }
        }
        this._plane = false;
    }

    onPointerEnter(p3d){
        this.shadowSphere.material.emissive = new THREE.Color(0x4444ff);
    }

    onPointerLeave(p3d){
        this.shadowSphere.material.emissive = new THREE.Color(0);
    }

    handleElected() {
        super.handleElected();
        this.updateFlight();
    //    this.fetchHistory().then(() => this.openSocket());
    }

    handleUnelected() {
        super.handleUnelected();
            this.closeSocket();
    }

    closeSocket() {
        if (this.socket) {
            this.socket.close();
        }
    }

getFlight(){
    let count = 0;
    this.sendex = 0;

    this.gettingFlight = true;
    // https://opensky-network.org/apidoc/rest.html
    fetch('https://opensky-network.org/api/states/all')
    .then(response => {
        if (response.ok) {
            response.json().then(data => {
            // Markers
            data.states.forEach(plane => {
                if (!plane[6] || !plane[5]) return;
                this.rawPlanes.push([plane[0],plane[5], plane[6], this.now()]);
            });
            this.gettingFlight = false;
            });
        } else console.log('Network response was not ok.');
    })
    .catch(error => console.log(error));
    }
}