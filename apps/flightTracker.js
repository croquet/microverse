// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { AM_Elected, PM_Elected} from "../src/DElected.js";
import { CardActor, CardPawn } from '../src/DCard.js';
import { THREE, mix, q_euler, q_multiply, ThreeRenderManager } from "@croquet/worldcore";
import earthbase from "../assets/images/earthbase.png";
import earthshadow from "../assets/images/earthshadow.jpg";

const SHADOWRADIUS = 3.95; // size of the earth (water)
const BASERADIUS = 4;      // size of the earth (land)

export class FlightTracker extends mix(CardActor).with(AM_Elected){
    get pawn() {return FlightDisplay;}
    init(options){
        super.init(options);
        this.listen("processFlight", this.processFlight);
        this.listen("startSpinning", this.startSpinning);
        this.listen("stopSpinning", this.stopSpinning);
        this.listen("updateFlight", this.updateFlight);
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

    processFlight(flightData){      // addarray data to map
        let now = this.now();
        flightData.forEach(fd =>this.planes.set(fd[0],[now, fd[1], fd[2]]));
    }

    updateFlight(){ //completed the map, now GC and inform view
        this.say("displayFlight");
    }
}

FlightTracker.register("FlightTracker");

class FlightDisplay extends mix(CardPawn).with(PM_Elected){
    constructor(actor){
        super(actor);
        this.listenDeck("displayFlight", this.displayFlight);
        this.constructEarth();
        this.addEventListener("pointerDown", "onPointerDown");
        this.addEventListener("pointerUp", "onPointerUp");
        this.addEventListener("pointerEnter", "onPointerEnter");
        this.addEventListener("pointerLeave", "onPointerLeave");
        this.addEventListener("pointerMove", "onPointerMove");
        this.chunkSize = 100; //number of plane records to send
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

        let geometry = new THREE.BufferGeometry();
        const vertices = [];
        vertices.push(0,0,0);
        const sprite = new THREE.TextureLoader().load( './assets/images/ball.png' );
/*
        for ( let i = 0; i < 4000; i ++ ) {

            let x = 2  * Math.random() - 1;
            let y = 2 * Math.random() - 1;
            let z = 2 * Math.random() - 1;

            let n=Math.sqrt(x*x+y*y+z*z);
            n=Math.max(0.0001, n);
            let radius = BASERADIUS + 0.1;
            x = radius * x/n;
            y = radius * y/n;
            z = radius * z/n;
            vertices.push( x, y, z );
        }
*/
        geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
        let material = new THREE.PointsMaterial( { size: 0.075, sizeAttenuation: true, map: sprite, alphaTest: 0.5, transparent: true } );
        material.color.set( 0xffaa33 );

        this.planes = new THREE.Points( geometry, material );
        this.shape.add( this.planes );
        this.displayFlight();
    }

    processFlight(){
        let len = this.rawPlanes.length;
        let nextTime =100;
        if(len===0){
            if(!this.gettingFlight)this.getFlight();
        }else{ //send the rawPlanes data to model
            let n = Math.min(len, this.sendex+this.chunkSize);
            let sendArray = this.rawPlanes.slice(this.sendex, n)
            this.say("processFlight", sendArray);
            this.sendex += this.chunkSize;
            if(this.sendex>len){
                this.rawPlanes = [];
                this.say("updateFlight");
                nextTime = 5000;
            }
        }
        this.future(nextTime).processFlight();
    }

    displayFlight(){
        const vertices = [];
        let e = new THREE.Euler();
        let v = new THREE.Vector3();
        this.actor.planes.forEach(val=>{
            // val[1] long
            // val[2] lat
            let lon = Math.PI*2*val[1]/360;
            let lat = Math.PI*2*val[2]/360;
            v.set(BASERADIUS + 0.05,0,0);
            e.set(0, lon, lat);
            v.applyEuler(e);
           vertices.push( v.x, v.y, v.z );
        })
        this.planes.geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
    }

    theta(xyz){
        let local = this.world2local(xyz);
        return Math.atan2(local[0],local[2]);
    }

    onPointerDown(p3d){
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
    }

    onPointerEnter(p3d){
        this.shadowSphere.material.emissive = new THREE.Color(0x4444ff);
    }

    onPointerLeave(p3d){
        this.shadowSphere.material.emissive = new THREE.Color(0);
    }

    handleElected() {
        super.handleElected();
        this.rawPlanes=[];
        this.processFlight();
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
        console.log("getFlight")
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