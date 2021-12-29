// Microverse
// TODO:
// "Come to me" button
// Select/highlight object
// Create visualizer
// Tilt camera when going down stairs
// Laser Controller
// Demo graphing
// Generic Importer
// Collisions
// Drag and drop
// Panel Controls

import { App, THREE, ModelRoot, ViewRoot, StartWorldcore, Actor, Pawn, mix, InputManager, PlayerManager,
         ThreeRenderManager, AM_Spatial, PM_Spatial, toRad} from "@croquet/worldcore";
import { DLayerManager, PM_ThreeVisibleLayer } from './src/DLayerManager.js';
import { AMVAvatar, PMVAvatar } from './src/MVAvatar.js';
import { D } from './src/DConstants.js';
import { GLTFLoader } from './src/three/examples/jsm/loaders/GLTFLoader.js';
import { TextPopupActor } from './src/popuptext.js';
import { AM_PerlinNoise } from './src/PerlinMixin.js';
import { Actor_Card } from './src/DCard.js';

import JSZip from "jszip";

const powerPlant = "./assets/refineryx.glb.zip";

const a1 = "./assets/avatars/generic/1.zip";
const a2 = "./assets/avatars/generic/2.zip";
const a3 = "./assets/avatars/generic/3.zip";
const a4 = "./assets/avatars/generic/4.zip";
const a5 = "./assets/avatars/generic/5.zip";
const a6 = "./assets/avatars/generic/6.zip";
const alice  = "./assets/avatars/alice.zip";
const cheshire = "./assets/avatars/cheshirecat.zip";
const hatter = "./assets/avatars/fixmadhatter.zip";
const hare = "./assets/avatars/marchhare.zip";
const queen = "./assets/avatars/queenofhearts.zip";
const rabbit = "./assets/avatars/whiterabbit.zip";

import skyFront from "./assets/sky/sh_ft.png";
import skyBack from "./assets/sky/sh_bk.png";
import skyRight from "./assets/sky/sh_rt.png";
import skyLeft from "./assets/sky/sh_lf.png";
import skyUp from "./assets/sky/sh_up.png";
import skyDown from "./assets/sky/sh_dn.png";

console.log('%cTHREE.REVISION:', 'color: #f00', THREE.REVISION);
console.log("%cJSZip.Version",  'color: #f00', JSZip.version);

async function loadGLB(zip, file, group, onComplete, position, scale, rotation, singleSide){
    await fetch(zip)
    .then(res => res.blob())
    .then(blob => {
        let jsz = new JSZip();
        jsz.loadAsync(blob, {createFolders: true}).then(function(zip){
            zip.file(file).async("ArrayBuffer").then(function(data) {
                (new GLTFLoader()).parse( data, null, function (gltf) {  
                    if(onComplete)onComplete(gltf, singleSide);
                    group.add( gltf.scene );
                    group.updateMatrixWorld ( true );
                    if(position)gltf.scene.position.set(...position);
                    if(scale)gltf.scene.scale.set(...scale);
                    if(rotation)gltf.scene.rotation.set(...rotation);
                    group.ready = true;
                    return group;
                });
            })
        })
    })
}

function addShadows(obj3d, singleSide) {
    obj3d.scene.traverse( n => {
        if(n.material){
            if(singleSide)n.material.side = THREE.FrontSide; //only render front side
            n.material.format = THREE.RGBAFormat; // fixes a bug in GLTF import
            n.castShadow = true;
            n.receiveShadow = true;
        }
    });
}

// these are defined outside of the Worldcore objects, otherwise, they will need to be recreated when the app goes to sleep and restarts again.

var i = 0;
const avatars = []; for(i=0; i<12;i++) avatars[i]=new THREE.Group;
i=0;
loadGLB(a3, "3.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
loadGLB(a4, "4.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
loadGLB(a5, "5.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
loadGLB(a6, "6.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
loadGLB(a1, "1.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
loadGLB(a2, "2.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);

loadGLB(alice, "alice.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
loadGLB(rabbit, "white.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
loadGLB(hatter, "fixmadhatter.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
loadGLB(hare, "march.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
loadGLB(queen, "queenofhearts.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);
loadGLB(cheshire, "cheshirecat.glb", avatars[i++], addShadows, [0,-0.2,0], [0.4, 0.4, 0.4], [0, Math.PI, 0], true);

const plant = new THREE.Group();
loadGLB(powerPlant, "refineryx.glb", plant, addShadows, [-152, -3, -228], [2,2,2], [0,0,0], false);

class AMAvatar extends AMVAvatar{
    init(options) {
        this.avatarIndex = options.index; // set this BEFORE calling super. Otherwise, AvatarPawn may not see it
        super.init(options);
    }

    get pawn() {return PMAvatar}
}

AMAvatar.register('AMAvatar');

class PMAvatar extends PMVAvatar {

    constructVisual(){
        this.setupAvatar(avatars[this.avatarIndex%avatars.length]);
    }

    setupAvatar(a){// create the avatar (cloned from above) 
        if(a.ready){
            a=this.avatar = a.clone();
            a.traverse( n => {if(n.material)n.material = n.material.clone();});
            this.layer = D.AVATAR;
            this.setRenderObject(a);  // note the extension 
        }else this.future(1000).setupAvatar(a);
    }
}

class LevelActor extends mix(Actor).with(AM_Spatial) {
    get pawn() {return LevelPawn}
    init(...args) {
        super.init(...args);
    }
}

LevelActor.register('LevelActor');

class LevelPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisibleLayer) {
    constructor(...args) {
        super(...args);
        const scene = this.service("ThreeRenderManager").scene;

        this.background = scene.background = new THREE.CubeTextureLoader().load([skyFront, skyBack, skyUp, skyDown, skyRight, skyLeft]);
        const ambient = new THREE.AmbientLight( 0xffffff, 0.25 );
        scene.lightLayer.add(ambient);

        const sun = this.sun = new THREE.DirectionalLight( 0xffa95c, 1 );
        sun.position.set(-200, 800, 100);
        sun.castShadow = true;
        //Set up shadow properties for the light
        
        sun.shadow.camera.near = 0.5; // default
        sun.shadow.camera.far = 1000; // default
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.zoom = 0.125;
        sun.shadow.bias = -0.0001;
        var side = 15;
        sun.shadow.camera.top = side;
        sun.shadow.camera.bottom = -side;
        sun.shadow.camera.left = side;
        sun.shadow.camera.right = -side;
        scene.lightLayer.add(sun);

        const hemiLight = this.hemiLight = new THREE.HemisphereLight(0xffeeb1, 0x080840, 0.2);
        scene.lightLayer.add(hemiLight);

        const renderer = this.service("ThreeRenderManager").renderer;
        renderer.toneMapping = THREE.ReinhardToneMapping;
        renderer.toneMappingExposure = 2;
        renderer.shadowMap.enabled = true;
        plant.layer = D.WALK;
        this.setRenderObject( plant );
        window.renderer = this.service("ThreeRenderManager");
        this.future(3000).publish(this.sessionId, "popup", {translation: [0, 0, -10]});
    }

    destroy() {
        super.destroy();
        this.background.dispose();
        this.sun.dispose();
        this.hemiLight.dispose();
    }
}
/*
class PerlinActor extends mix(Actor).with(AM_Spatial, AM_PerlinNoise){
    get pawn() {return PerlinPawn}
    init(...args) {
        this.visible = true;
        super.init(...args);
        this.initPerlin(); // call this before init. PerlinPawn requires this.
        this.future(1000).updatePerlin();
        this.listen("showHide", this.showHide);
        this._translation = [0, -2.75, -10];
        //this.group.rotation.y = Math.PI/2;
    }

    initPerlin(){
        let r = this.currentRow = this.rows=20;
        let c = this.columns=20;
        let d = this.delta=0.1;
        this.data=[];
        let i,j;
        for(i=0;i<this.rows;i++){
            this.data[i]=[];
            for(j=0;j<this.columns;j++){
                this.data[i].push(this.noise2D(i*d,j*d));
            }
        }
    }

    updatePerlin(){
        this.data.shift(); // dump the first row
        let row = [];
        let d = this.delta;
        for(let i=0;i<this.columns;i++)
            row.push(this.noise2D(this.currentRow*d, i*d));
        this.data.push(row); 
        this.currentRow++;
        this.say("updatePerlin", row);
        this.future(100).updatePerlin();    
    }

    showHide(){
        this.visible = !this.visible;
        this.say("showMe", this.visible);
    }

}
PerlinActor.register('PerlinActor');

const maxHeight = 8;
const barScale = 0.25;

class PerlinPawn extends mix(Pawn).with(PM_Spatial, PM_ThreeVisibleLayer){
    constructor(...args) {
        super(...args);
        this.listen("updatePerlin", this.updatePerlin);
        this.listen("showMe", this.showMe);
        this.isConstructed = false;
        this.perlin = true;
    }

    updatePerlin(row){

        const r = this.actor.rows;
        const s = barScale;
        if(this.isConstructed){
            let rg = this.rowGeometry.shift();
            this.rowGeometry.push(rg);
            for(let i=0; i<rg.children.length;i++){
                this.setBar(rg.children[i],row[i],r,i);
            }
            for(let i=0; i< r; i++){
                this.rowGeometry[i].position.set(0,s/4,(i-r/2)*s);
            }
            
        }
        else this.constructPerlin();
    }

    constructPerlin(){
        console.log("constructPerlin", this.actor, this.actor.rows, this.actor.columns);
        const data = this.actor.data;
        const r = this.actor.rows;
        const c = this.actor.columns;
        const s = barScale;

        this.group = new THREE.Group();
        this.color = new THREE.Color();
        this.base = new THREE.Mesh(new THREE.BoxGeometry((r+2)*s, s/2, (c+2)*s, 2, 10, 2 ),
            new THREE.MeshStandardMaterial({color: this.color.getHex()}));
        this.base.position.set(-s/2, 0, -s/2);
        this.bar = new THREE.Mesh(new THREE.BoxGeometry(s, s, s, 1, 10, 1 ),
            new THREE.MeshStandardMaterial({color: this.color.getHex()}));
        this.base.layers.enable(1); // use this for raycasting
        this.base.castShadow = true;
        this.base.receiveShadow = true;
        this.group.add(this.base);
        //this.group.position.set(0, -2.75, -10);
        //this.group.rotation.y = Math.PI/2;
        this.layer = D.EVENT;
        this.setRenderObject( this.group );
        this.rowGeometry = [];
        for(let i=0; i<r; i++){
            let rGroup = new THREE.Group();
            rGroup.position.set(0,s/4,(i-r/2)*s);
            for(let j=0; j<c;j++){
                let bar = this.bar.clone();
                bar.material = bar.material.clone();
                let d = data[i][j];
                this.setBar(bar, d, r, j);
                rGroup.add(bar);
            }
            this.rowGeometry.push(rGroup);
            this.group.add(rGroup);
        }
        this.perlinGroup = this.group;
        this.perlinGroup.visible=this.actor.visible;
        this.isConstructed=true;
    }

    setBar(bar, d, rlength, j){
        const s = barScale;
        //bar.material.color.setRGB((1-d)/2, 1-d*d, (1+d)/2);
        let b= Math.cos((1-d)*Math.PI); b=Math.min(1,(b+1)/1.25);
        let g= Math.sin(d*Math.PI); g=(g+1)/2.2;
        let r= Math.cos(d*Math.PI); r=Math.min(1, (r+1)/1.25);

        bar.material.color.setRGB(r, g, b);
        d=d*maxHeight;
        bar.position.set((j-rlength/2)*s, s*d/2, 0);
        bar.scale.set(1, d, 1);
    }

    showMe(visible){
        console.log(visible);
        this.perlinGroup.visible=visible;
    }
}
*/
class MyPlayerManager extends PlayerManager {
    createPlayer(options) {
        options.index = this.count;
        options.lookYaw = toRad(45);
        options.color = [Math.random(), Math.random(), Math.random(), 1];
        return AMAvatar.create(options);
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
        //this.perlin = PerlinActor.create();
        this.editCard = Actor_Card.create();
        this.popup = TextPopupActor.create();
        this.popup.set({translation: [-5, 0, -5]});
    }
}

MyModelRoot.register("MyModelRoot");

class MyViewRoot extends ViewRoot {
    static viewServices() {
        return [InputManager, ThreeRenderManager, DLayerManager];
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


console.log( [
' ',
'  ________  ____  ____  __  ____________ ',
' / ___/ _ \\/ __ \\/ __ \\/ / / / __/_  __/',
'/ /__/ , _/ /_/ / /_/ / /_/ / _/  / /   ',
'\\___/_/|_|\\____/\\___\\_\\____/___/ /_/',  
'  ',
].join( '\n' ) );
