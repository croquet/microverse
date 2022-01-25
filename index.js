// Microverse
// TODO:
// https://docs.google.com/document/d/1Z1FsTAEQI699HhTXHURN5aOMEPLFQ1-BDXgFBkcyUGw/edit


import {
    App, THREE, ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PlayerManager,
    ThreeRenderManager, AM_Spatial, PM_Spatial, toRad} from "@croquet/worldcore";
import { DLayerManager, PM_ThreeVisibleLayer } from './src/DLayerManager.js';
import { AMVAvatar, PMVAvatar } from './src/MVAvatar.js';
import { D } from './src/DConstants.js';
//import { GLTFLoader } from './src/three/examples/jsm/loaders/GLTFLoader.js';
import { loadGLB, addShadows } from '/src/LoadGLB.js';
import { TextFieldActor } from './src/text/text.js';
import { PerlinActor } from './src/PerlinMixin.js';
import { Card } from './src/DCard.js';
import { TextureSurface, VideoSurface, DemoCanvasSurface } from './src/DSurface.js';
import { MultiBlaster } from './src/multiblaster.js';
import { createChess } from './src/chess.js';

console.log('%cTHREE.REVISION:', 'color: #f00', THREE.REVISION);
//import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';

import skyFront from "./assets/sky/sh_ft.png";
import skyBack from "./assets/sky/sh_bk.png";
import skyRight from "./assets/sky/sh_rt.png";
import skyLeft from "./assets/sky/sh_lf.png";
import skyUp from "./assets/sky/sh_up.png";
import skyDown from "./assets/sky/sh_dn.png";

// these are defined outside of the Worldcore objects, otherwise, they will need to be recreated when the app goes to sleep and restarts again.

const avatars = [];
let plant;

function loadBasicModels() {
    let maxAvatars = 12;
    let i = 0;
    for (i = 0; i < maxAvatars; i++) avatars[i] = new THREE.Group();
    for (i = 0; i < 6; i++) {
        loadGLB(`./assets/avatars/generic/${i + 1}.zip`, avatars[i], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
    }
    if (maxAvatars > 6) {
        loadGLB("./assets/avatars/alice.zip", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
        loadGLB("./assets/avatars/newwhite.zip", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
        loadGLB("./assets/avatars/fixmadhatter.zip", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
        loadGLB("./assets/avatars/marchhare.zip", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
        loadGLB("./assets/avatars/queenofhearts.zip", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
        loadGLB("./assets/avatars/cheshirecat.zip", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
    }

    plant = new THREE.Group();
    loadGLB("./assets/refineryx.glb.zip", plant, addShadows, [-152, -3, -228], [2,2,2], [0,0,0], false);
    //loadGLB("./assets/3D/ArizonaProject.glb.zip", plant, addShadows, [100, -3, 0], [.01,.01,.01], [0,0,0], false);
}

loadBasicModels();

class Avatar extends AMVAvatar {
    init(options) {
        this.avatarIndex = options.index; // set this BEFORE calling super. Otherwise, AvatarPawn may not see it
        super.init(options);
    }

    get pawn() {return AvatarPawn;}
}

Avatar.register('Avatar');

class AvatarPawn extends PMVAvatar {

    constructVisual() {
        this.setupAvatar(avatars[this.avatarIndex % avatars.length]);
    }

    setupAvatar(a) {// create the avatar (cloned from above)
        if (a.ready) {
            a = this.avatar = a.clone();
            a.traverse(n => {
                if (n.material) {
                    n.material = n.material.clone();
                }
            });
            this.layer = D.AVATAR;
            this.setRenderObject(a);  // note the extension
        } else {
            this.future(1000).setupAvatar(a);
        }
    }
}

class LevelActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return LevelPawn;}
}
LevelActor.register('LevelActor');

class LevelPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisibleLayer) {
    constructor(...args) {
        super(...args);

        this.layer = D.WALK;
        this.setRenderObject(plant);
        this.future(3000).publish(this.sessionId, "popup", {translation: [0, 0, -10]});
    }
}

class MyPlayerManager extends PlayerManager {
    createPlayer(options) {
        options.index = this.count;
        options.lookYaw = toRad(45);
        options.color = [Math.random(), Math.random(), Math.random(), 1];
        return Avatar.create(options);
    }
}

MyPlayerManager.register("MyPlayerManager");

class MyModelRoot extends ModelRoot {
    static modelServices() {
        return [MyPlayerManager];
    }
    init(...args) {
        super.init(...args);
        this.level = LevelActor.create();

        this.perlin = PerlinActor.create(
            {translation:[ 10, -2.75, -14],
             rotation:[ 0, -0.7071068, 0, 0.7071068 ]}
        );

        let tSurface = TextureSurface.create({url: './assets/images/Kay.jpg'});
        let t2Surface = TextureSurface.create({url: './assets/images/Colony.png'});
       
        let vSurface = VideoSurface.create({url:'./assets/videos/fromPCtoHMD.mp4'});
        let v2Surface = VideoSurface.create({url:'./assets/videos/Colony.mp4'});
        
        let cSurface = DemoCanvasSurface.create({name: 'DemoCanvasSurface'});
        let gSurface = MultiBlaster.create({name:'MultiBlaster'});

        let svgCards = [
            'credit-card.svg', 'square.svg', 'credit-card.svg', 
            'square.svg', 'square-full.svg', 'circle.svg', 'compass.svg', 'credit-card.svg', 'cog.svg'];
        let surfaces = [tSurface, cSurface, vSurface, gSurface, v2Surface, vSurface, cSurface, t2Surface];
        for (let i = 0; i < 8; i++) {
            Card.create({
                cardShapeURL: `./assets/SVG/${svgCards[i]}`,
                cardSurface: surfaces[i],
                cardFullBright: surfaces[i] === vSurface || surfaces[i] === cSurface || surfaces[i] === gSurface,
                cardDepth: 0.1,
                cardBevel:0.02,
                cardColor:[1,1,1], // white
                translation:[0,-0.5, -6 * (i + 1)],
                scale: [4,4,4],
                cardInstall: true
            });
        }

        createChess([8, -2.5, -30], [6,6,6]);

        this.initialText = TextFieldActor.create();
        this.initialText.loadAndReset([{text: "Croquet is awesome!"}]);
        this.initialText.set({translation: [10, 0, -10]});
    }
}

MyModelRoot.register("MyModelRoot");

class MyViewRoot extends ViewRoot {
    static viewServices() {
        return [InputManager, {service: ThreeRenderManager, options:{antialias:true}}, DLayerManager];
    }
    constructor(model) {
        super(model);
        const TRM = this.service("ThreeRenderManager");
        const scene = window.scene = TRM.scene;

        this.background = scene.background = new THREE.CubeTextureLoader().load([skyFront, skyBack, skyUp, skyDown, skyRight, skyLeft]);
    // xyzzy    const ambient = new THREE.AmbientLight( 0xffffff, 0.25 );
        const ambient = new THREE.AmbientLight( 0xffffff, .75 );
 
        scene.lightLayer.add(ambient);

        const sun = this.sun = new THREE.DirectionalLight( 0xffe0b5, 1 );
        //sun.position.set(-200, 800, 100);
        sun.position.set(-400, 500, 100);

        let side = 15;

        //Set up shadow properties for the light
        sun.castShadow = true;
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
        scene.lightLayer.add(sun);

        // xyzzy this.moon = new THREE.DirectionalLight( 0x6cbbff, 0.12 );
        this.moon = new THREE.DirectionalLight( 0x6cbbff, 0.5 );
        this.moon.position.set(200, 100, -100);
        scene.lightLayer.add(this.moon);

        const hemiLight = this.hemiLight = new THREE.HemisphereLight(0xffeeb1, 0xc7ccff, 0.25);
        scene.lightLayer.add(hemiLight);

        const renderer = window.renderer = this.service("ThreeRenderManager").renderer;
        renderer.toneMapping = THREE.ReinhardToneMapping;
        renderer.toneMappingExposure = 2;
        renderer.shadowMap.enabled = true;
        renderer.localClippingEnabled = true;
    }

    destroy() {
        super.destroy();
        this.background.dispose();
        this.sun.dispose();
        this.hemiLight.dispose();
    }
}

App.makeWidgetDock();
StartWorldcore({
    appId: 'io.croquet.microverse',
    apiKey: '1_nsjqc1jktrot0iowp3c1348dgrjvl42hv6wj8c2i',
    name: App.autoSession(),
    password: 'password',
    model: MyModelRoot,
    view: MyViewRoot,
    tps:60,
    eventRateLimit: 60,
});


console.log(` 
  ________  ____  ____  __  ____________ 
 / ___/ _ \\/ __ \\/ __ \\/ / / / __/_  __/
/ /__/ , _/ /_/ / /_/ / /_/ / _/  / /   
\\___/_/|_|\\____/\\___\\_\\____/___/ /_/
`);
