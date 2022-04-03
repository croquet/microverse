// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { THREE } from "@croquet/worldcore";

import { CardActor, CardPawn } from "./DCard.js";

/*
import skyFront from "../assets/sky/sh_ft.png";
import skyBack from "../assets/sky/sh_bk.png";
import skyRight from "../assets/sky/sh_rt.png";
import skyLeft from "../assets/sky/sh_lf.png";
import skyUp from "../assets/sky/sh_up.png";
import skyDown from "../assets/sky/sh_dn.png";
*/

export class DLight extends CardActor {
    get pawn() {return DLightPawn;}
}

DLight.register('DLight');

class DLightPawn extends CardPawn {
    constructor(options) {
        console.log("construct lights")
        super(options);
        this.addToLayers('light');
        let trm = this.service("ThreeRenderManager");
        let scene =  trm.scene;
        let camera = trm.camera;
        // console.log(window.scene);
        this.setupCSM(scene, camera, THREE);
        let group = this.shape;

        // this.background = scene.background = new THREE.CubeTextureLoader().load([skyFront, skyBack, skyUp, skyDown, skyRight, skyLeft]);
        // xyzzy    const ambient = new THREE.AmbientLight( 0xffffff, 0.25 );
        const ambient = new THREE.AmbientLight( 0xffffff, .75 );
 
        group.add(ambient);

        const sun = this.sun = new THREE.DirectionalLight( 0xffe0b5, 1 );
        //sun.position.set(-200, 800, 100);
        sun.position.set(400, 500, 400);

        let side = 15;

        //Set up shadow properties for the light
    /*    sun.castShadow = true;
        sun.shadow.camera.near = 0.5; // default
        sun.shadow.camera.far = 1000; // default
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.zoom = 0.125;
        sun.shadow.bias = -0.0001;
        sun.shadow.camera.top = side;
        sun.shadow.camera.bottom = -side;
        sun.shadow.camera.left = side;
        sun.shadow.camera.right = -side;
        */
        group.add(sun);

        this.moon = new THREE.DirectionalLight( 0x6cbbff, 0.12 );
        this.moon = new THREE.DirectionalLight( 0x6cbbff, 0.5 );
        this.moon.position.set(200, 100, -100);
        group.add(this.moon);

        this.hemiLight = this.hemiLight = new THREE.HemisphereLight(0xffeeb1, 0xc7ccff, 0.25);
        group.add(this.hemiLight);
        group.name = "Light Card";
    }

    destroy() {
        console.log("destroy lights")
        if(this.background)this.background.dispose();
        this.sun.dispose();
        this.hemiLight.dispose();
        this.moon.dispose();
        super.destroy();
    }

    setupCSM(scene, camera, THREE){
        console.log("CSM", THREE.CSM)
        this.csm = new THREE.CSM({
            fade: true,
            far: camera.far,
            maxFar: 1000,
            cascades: 4,
            shadowMapSize: 2048,
            shadowbias: 0.001,
            lightDirection: new THREE.Vector3(-1, -1, 0),
            camera: camera,
            parent: scene,
            lightIntensity: 0.5,
            lightFar: 1000,
            mode: "practical"
          });
    }

    update(time){
        if(this.csm)this.csm.update();
    }
}

/* globals ASSETS_DIRECTORY */
