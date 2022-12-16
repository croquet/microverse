import * as THREEModule from 'three';
import * as THREE_MESH_BVH from 'three-mesh-bvh';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';
import { CSMFrustum } from 'three/examples/jsm/csm/CSMFrustum.js';
import { CSMShader } from 'three/examples/jsm/csm/CSMShader.js';
import { CSM } from 'three/examples/jsm/csm/CSM.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { VRMLLoader } from 'three/examples/jsm/loaders/VRMLLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FontLoader, Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm//webxr/XRControllerModelFactory.js';

import { PM_Visible, PM_Camera, RenderManager } from "@croquet/worldcore-kernel";

//------------------------------------------------------------------------------------------
//-- ThreeVisible  -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
const PM_ThreeVisible = superclass => class extends PM_Visible(superclass) {

    constructor(...args) {
        super(...args);
        this.listen("viewGlobalChanged", this.refreshDrawTransform);
    }

    destroy() {
        super.destroy();
        const render = this.service("ThreeRenderManager");
        if (render && render.scene) {
            if(this.renderObject)render.scene.remove(this.renderObject);
            if(this.colliderObject)render.scene.remove(this.colliderObject);
        }
    }

    refreshDrawTransform() {
        if(this.renderObject){
            this.renderObject.matrix.fromArray(this.global);
            this.renderObject.matrixWorldNeedsUpdate = true;
        }
        if(this.colliderObject){
            this.colliderObject.matrix.fromArray(this.global);
            this.colliderObject.matrixWorldNeedsUpdate = true;
        }
    }

    setRenderObject(renderObject) {
        const render = this.service("ThreeRenderManager");
        if (render) render.dirtyAllLayers();
        renderObject.wcPawn = this;
        this.renderObject = renderObject;
        this.renderObject.matrixAutoUpdate = false;
        this.renderObject.matrix.fromArray(this.global);
        this.renderObject.matrixWorldNeedsUpdate = true;
        if (render && render.scene) render.scene.add(this.renderObject);
        if (this.onSetRenderObject) this.onSetRenderObject(renderObject);
    }

    setColliderObject(colliderObject) {
        const render = this.service("ThreeRenderManager");
        if (render) render.dirtyAllLayers();
        colliderObject.wcPawn = this;
        this.colliderObject = colliderObject;
        this.colliderObject.matrixAutoUpdate = false;
        this.colliderObject.matrix.fromArray(this.global);
        this.colliderObject.matrixWorldNeedsUpdate = true;
        if (render && render.scene) render.scene.add(this.colliderObject);
    }
};



//------------------------------------------------------------------------------------------
//-- ThreeCamera  --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

const PM_ThreeCamera = superclass => class extends PM_Camera(superclass) {
    constructor(...args) {
        super(...args);

        if (this.isMyPlayerPawn) {
            const render = this.service("ThreeRenderManager");
            render.camera.matrix.fromArray(this.lookGlobal);
            render.camera.matrixAutoUpdate = false;
            render.camera.matrixWorldNeedsUpdate = true;

            this.listen("lookGlobalChanged", this.refreshCameraTransform);
            this.listen("viewGlobalChanged", this.refreshCameraTransform);
        }
    }

    refreshCameraTransform() {
        const render = this.service("ThreeRenderManager");
        render.camera.matrix.fromArray(this.lookGlobal);
        render.camera.matrixWorldNeedsUpdate = true;
    }

    setRayCast(xy) {
        const x = ( xy[0] / window.innerWidth ) * 2 - 1;
        const y = - ( xy[1] / window.innerHeight ) * 2 + 1;
        const render = this.service("ThreeRenderManager");
        if (!this.raycaster) this.raycaster = new THREE.Raycaster();
        this.raycaster.setFromCamera({x: x, y: y}, render.camera);
        this.raycaster.params.Line = {threshold: 0.2};
        this.raycaster.params.Point = {threshold: 0.2};
        return this.raycaster;
    }

    setXRRayCast(xrEvent) {
        let vec = new THREE.Vector3(0, 0, -1);
        vec.applyEuler(xrEvent.target.rotation);
        if (!this.raycaster) this.raycaster = new THREE.Raycaster();
        this.raycaster.set(xrEvent.target.position, vec);
    }

    pointerRaycast(source, targets, optStrictTargets) {
        if (Array.isArray(source)) {
            this.setRayCast(source);
        } else {
            this.setXRRayCast(source);
        }
        const render = this.service("ThreeRenderManager");
        const h = this.raycaster.intersectObjects(targets || render.threeLayer("pointer"));
        if (h.length === 0) {
            return {ray: this.raycaster.ray.clone()};
        }

        let hit;
        let normal;
        if (optStrictTargets) {
            for (let i = 0; i < h.length; i++) {
                let me = h[i].object;
                let wcPawn = me.wcPawn;
                while (!wcPawn && me) {
                    me = me.parent;
                    wcPawn = me.wcPawn;
                }
                if (wcPawn) {
                    normal = wcPawn.hitNormal;
                    if (Array.isArray(normal)) {
                        normal = new THREE.Vector3(...normal);
                    }
                    hit = h[i];
                    break;
                }
            }
        }

        for (let i = 0; i < h.length; i++) {
            let me = h[i].object;
            if (me.renderOrder > 1000) {
            // we would actually sort them in renderOrder, but for now we use only for special cases,
            // and orders among objects with renderOrder should not come in play easily
                hit = h[i];
                break;
            }
        }

        if (!hit) {
            hit = h[0];
        }

        if(hit.face && !normal) {
            normal = hit.face.normal;
        }
        if (normal) {
            let m = new THREE.Matrix3().getNormalMatrix( hit.object.matrixWorld );
            normal = normal.clone().applyMatrix3( m ).normalize();
        }

        return {
            pawn: this.getPawn(hit.object),
            xyz: hit.point.toArray(),
            uv: hit.uv ? hit.uv.toArray() : undefined,
            normal: normal ? normal.toArray() : undefined,
            distance: hit.distance,
            ray: this.raycaster.ray.clone()
        };
    }

    getPawn(object) {
        let o = object;
        while(!o.wcPawn) {
            if (!o.parent) return null;
            o = o.parent;
        };
        return o.wcPawn;
    }

};

//------------------------------------------------------------------------------------------
//-- XRController --------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

class XRController {
    constructor(manager) {
        this.manager = manager;
        this.controllerModelFactory = new XRControllerModelFactory();

        this.raycaster = new THREE.Raycaster();

        function selectStart(controller, evt) {
            if (manager.avatar) {
                let e = {
                    button: 0,
                    buttons: 1,
                    id: 1,
                    source: evt,
                };
                manager.avatar.doPointerDown(e);
            }
            controller.userData.pointerDown = true;
            controller.userData.pointerDownTime = Date.now();
        }

        function selectEnd(controller, evt) {
            if (manager.avatar) {
                let e = {
                    button: 0,
                    buttons: 1,
                    id: 1,
                    source: evt,
                };
                if (controller.userData.pointerDownTime) {
                    let now = Date.now();
                    if (now - controller.userData.pointerDownTime < 400) {
                        manager.avatar.doPointerTap(e);
                    }
                }
                manager.avatar.doPointerUp(e);
            }
            controller.userData.pointerDown = false;
            controller.userData.pointerDownTime = null;
        }

        [0, 1].forEach((i) => {
            let n = `controller${i}`;
            this[n] = manager.renderer.xr.getController(i);
            let c = this[n];
            c.addEventListener("selectstart", (evt) => selectStart(c, evt));
            c.addEventListener("selectend", (evt) => selectEnd(c, evt));
            c.userData.pointerDown = false;
            c.addEventListener("connected", (event) => {
                c.add(this.buildController(event.data, i));
            });
            c.addEventListener("disconnected", () => {
                c.remove(c.children[0]);
                manager.origReferenceSpace = null;
            });
            manager.scene.add(c);

	    let gn = `controllerGrip${i}`;
            this[gn] = manager.renderer.xr.getControllerGrip(i);
            let g = this[gn];
	    g.add(this.controllerModelFactory.createControllerModel(g));
	    manager.scene.add(g);
        });
        this.lastDelta = [0, 0];
    }

    buildController(data, i) {
        let geometry;
        let material;

        if (data.gamepad) {
            this[`gamepad${i}`] = data.gamepad;
        }

        if (!this.manager.origReferenceSpace) {
            this.manager.origReferenceSpace = this.manager.renderer.xr.getReferenceSpace();
        }

        switch (data.targetRayMode) {
            case 'tracked-pointer':
                geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, - 1 ], 3));
                geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));
                material = new THREE.LineBasicMaterial({vertexColors: true, blending: THREE.AdditiveBlending});
                return new THREE.Line(geometry, material);
            case 'gaze':
                geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, -1);
                material = new THREE.MeshBasicMaterial({opacity: 0.5, transparent: true});
                return new THREE.Mesh(geometry, material);
        }

    }

    update(avatar) {
        let dx = 0;
        let dy = 0;
        dx += this.gamepad0?.axes[2] || 0;
        dx += this.gamepad1?.axes[2] || 0;
        dy += this.gamepad0?.axes[3] || 0;
        dy += this.gamepad1?.axes[3] || 0;

        if ((this.lastDelta[0] === 0 && this.lastDelta[1] === 0) &&
            (dx !== 0 || dy !== 0)) {
            avatar.startMotion();
        }

        if (dx !== 0 || dy !== 0) {
            avatar.updateMotion(dx * 80, dy * 80);
        }
        if ((this.lastDelta[0] !== 0 || this.lastDelta[1] !== 0) &&
            (dx === 0 && dy === 0)) {
            avatar.endMotion();
        }
        this.lastDelta = [dx, dy];

        if (this.controller0.userData.pointerDown) {
            let e = {
                button: 0,
                buttons: 1,
                id: 1,
                source: {target: this.controller0}
            };
            avatar.doPointerMove(e);
        }

        if (this.controller1.userData.pointerDown) {
            let e = {
                button: 0,
                buttons: 1,
                id: 1,
                source: {target: this.controller1}
            };
            avatar.doPointerMove(e);
        }
    }
}


//------------------------------------------------------------------------------------------
//-- ThreeRenderManager --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// The top render interface that controls the execution of draw passes.

class ThreeRenderManager extends RenderManager {
    constructor(options = {}, name) {
        super(options, name || "ThreeRenderManager");

        this.threeLayers = {}; // Three-specific layers

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);

        if (!options.canvas) {
            this.canvas = document.createElement("canvas");
            this.canvas.id = "ThreeCanvas";
            this.canvas.style.cssText = "position: absolute; left: 0; top: 0; z-index: 0";
            document.body.insertBefore(this.canvas, null);
            options.canvas = this.canvas;
        }

        this.setupRenderer(options);
    }

    setupRenderer(options) {
        if (this.renderer) {
            this.renderer.dispose();
        }

        if (this.vrButton) {
            this.vrButton.remove();
        }

        if (this.canvas) {
            options.canvas = this.canvas;
        }

        this.renderer = new THREE.WebGLRenderer(options);
        this.renderer.shadowMap.enabled = true;

        this.vrButtonStyleSet = false;

        this.hasXR().then((xr) => {
            if (xr) {
                this.vrButton = VRButton.createButton(this.renderer);
                let styleCallback = (records, _observer) => {
                    let styleChanged = false;

                    for (let i = 0; i < records.length; i++) {
                        if (records[i].type === "attributes") {
                            styleChanged = true;
                            break;
                        }
                    }
                    if (styleChanged) {
                        if (this.vrButton.textContent === "ENTER VR") {
                            if (!this.vrButtonStyleSet) {
                                this.vrButtonStyleSet = true;
                                this.vrButton.style.removeProperty("left"); // ?
                                if (window.enterVRButtonStyle) {
                                    for (let key in window.enterVRButtonStyle) {
                                        let value = window.enterVRButtonStyle[key];
                                        this.vrButton.style.setProperty(key, value);
                                    }
                                } else {
                                    this.vrButton.style.setProperty("right", "20px");
                                }
                            }
                        }
                    }
                };
                if (this.observer) {
                    this.observer.disconnect();
                    this.observer = null;
                }
                this.observer = new MutationObserver(styleCallback);
                this.observer.observe(this.vrButton, {attributes: true, attributeFilter: ["style"]});

                document.body.appendChild(this.vrButton);
                this.renderer.xr.enabled = true;
                this.xrController = new XRController(this);
            } else {
                // at this moment, there is no effects added but this is where they will go.
                this.composer = new EffectComposer( this.renderer );
                this.renderPass = new RenderPass( this.scene, this.camera );
                this.composer.addPass( this.renderPass );
            }
            this.resize();
            this.subscribe("input", "resize", () => this.resize());
            this.setRender(true);
        });
    }

    installOutlinePass(){
        if(!this.outlinePass){
            this.outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), this.scene, this.camera );
            this.outlinePass.edgeStrength = 3.0;
            this.outlinePass.edgeGlow = 0.1;
            this.outlinePass.edgeThickness = 1.5;
            this.outlinePass.pulsePeriod = 2.0;
            this.outlinePass.visibleEdgeColor.set( '#88ff88' );
            this.outlinePass.hiddenEdgeColor.set( '#ff0000' );
            this.outlinePass.selectedObjects = [];
            this.composer.addPass( this.outlinePass );
        }
    }

    addToOutline(obj){
        if(!this.outlinePass)this.installOutlinePass();
        this.outlinePass.selectedObjects.push( obj );
    }

    clearOutline(){
        this.outlinePass.selectedObjects = [];
    }

    setRender(bool) {
        this.doRender = bool;
    }

    async hasXR() {
        try {
            return await navigator.xr.isSessionSupported("immersive-vr");
        } catch (_) {
            return false;
        }
    }

    destroy() {
        super.destroy();
        this.renderer.dispose();
        if (this.canvas) this.canvas.remove();
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (this.composer) {
            this.composer.setSize(window.innerWidth, window.innerHeight)
        }
    }

    dirtyLayer(name) {
        this.threeLayers[name] = null;
    }

    dirtyAllLayers(){
        this.threeLayers = {};
    }

    threeLayer(name) {
        if (!this.layers[name]) return [];
        if (!this.threeLayers[name]) {
            this.threeLayers[name] = Array.from(this.layers[name]).map(p => p.colliderObject || p.renderObject);
        }
        return this.threeLayers[name];
    }

    threeLayerUnion(...names) {
        let result = [];
        while (names.length > 0) {
            const a = this.threeLayer(names.pop());
            result = result.concat(a.filter(x => result.indexOf(x) < 0))
        }
        return result;
    }

    update() {
        if (this.doRender) {
            if (this.composer) {
                this.composer.render();
            } else {
                this.renderer.render(this.scene, this.camera);
            }
        }

        if (this.xrController && this.avatar) {
            this.xrController.update(this.avatar);
        }
    }
}

const THREE = {
    ...THREEModule, Pass, UnrealBloomPass, CopyShader, CSMFrustum, CSMShader, CSM,
    OBJLoader, MTLLoader, GLTFLoader, FBXLoader, VRMLLoader, DRACOLoader, SVGLoader, EXRLoader, BufferGeometryUtils,
    FontLoader, Font, TextGeometry
};

export {THREE, THREE_MESH_BVH, PM_ThreeVisible, PM_ThreeCamera, ThreeRenderManager};
