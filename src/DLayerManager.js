// Copyright 2022 by Croquet Corporation. All Rights Reserved.
// Layer Manager
//
// We break the rendered scene into multiple "layers" which are used to optimize search and interaction
// particularly when using the raytest. Each layer is in a seperate 3D group that is tested independently.
// The current layers are:
// LIGHT_LAYER - lighting object layer
// EVENT_LAYER - objects that can be interacted with by the user
// WALK_LAYER - objects that the avatars can walk on and collide with
// AVATAR_LAYER - objects that represent the users
//
// Layers can be accessed using getters in the scene: e.g. scene.lightLayer
// or they can be accessed using the constant layer value and the array: scene.allLayers[D_CONSTANTS.LIGHT_LAYER]
// To use layers, you will also need to use the PM_ThreeVisibleLayer mixin instead of PM_THREEVISIBLE.
// It provides an additional layer argument for setRenderObject.
//
// To consider:
// The current model only allows an object to be in a single layer.
// Would it make sense to allow objects to exist within multiple layers?
// You may wish to walk on an editable object.
// Instead of using 3D groups, we would need to use regular arrays to track the objects in the various layers.
// An object could then be in multiple arrays.

import { ViewService } from "@croquet/worldcore-kernel";
import { D_CONSTANTS } from './DConstants.js';
import { THREE } from "@croquet/worldcore";
//------------------------------------------------------------------------------------------
//-- DLayerManager --------------------------------------------------------------------
//------------------------------------------------------------------------------------------

// Construct and access the render/ui layers.

export class DLayerManager extends ViewService {
    constructor(options = {}, name) {
        super(name || "DLayerManager");
        this.groupLayers = [];
        this.groupLayers[D_CONSTANTS.LIGHT_LAYER] = new THREE.Group();
        this.groupLayers[D_CONSTANTS.EVENT_LAYER] = new THREE.Group();
        this.groupLayers[D_CONSTANTS.WALK_LAYER] = new THREE.Group();
        this.groupLayers[D_CONSTANTS.AVATAR_LAYER] = new THREE.Group();
        
        const scene = this.service("ThreeRenderManager").scene;
        
        scene.add(this.lightLayer);
        scene.add(this.eventLayer);
        scene.add(this.walkLayer);
        scene.add(this.avatarLayer);
        
        // useful to have the scene "know" where the layers are
        scene.allLayers = this.groupLayers;
        scene.lightLayer = this.lightLayer;
        scene.eventLayer = this.eventLayer;
        scene.walkLayer = this.walkLayer;
        scene.avatarLayer = this.avatarLayer;
        
        console.log("DLayerManager Constructed!")
    }

    update(){}
    get allLayers(){ return this.groupLayers; }
    get lightLayer(){ return this.groupLayers[D_CONSTANTS.LIGHT_LAYER] }
    get eventLayer(){ return this.groupLayers[D_CONSTANTS.EVENT_LAYER] }
    get walkLayer(){ return this.groupLayers[D_CONSTANTS.WALK_LAYER] }
    get avatarLayer(){ return this.groupLayers[D_CONSTANTS.AVATAR_LAYER] }

}

// Same as PM_ThreeVisible but adding support for layers
export const PM_ThreeVisibleLayer = superclass => class extends superclass {

    constructor(...args) {
        super(...args);
        this.listen("viewGlobalChanged", this.refreshDrawTransform);
    }

    destroy() {
        super.destroy();
        const render = this.service("ThreeRenderManager");
        if (render && render.scene){ 
            if(this.layer)render.scene.allLayers[this.layer].remove(this.renderObject);
            else render.scene.remove(this.renderObject);
        }
    }

    refreshDrawTransform() {
        if(this.renderObject){
            this.renderObject.matrix.fromArray(this.global);
            this.renderObject.matrixWorldNeedsUpdate = true;
        }
    }

    setRenderObject(renderObject, layer) {
        const render = this.service("ThreeRenderManager");
        this.layer = layer;
        this.renderObject = renderObject;
        this.renderObject.matrixAutoUpdate = false;
        this.renderObject.matrix.fromArray(this.global);
        this.renderObject.matrixWorldNeedsUpdate = true;
        this.renderObject.userData = this; // used to find the Worldcore object from the 3D model
        if (render && render.scene){
            if(layer) render.scene.allLayers[layer].add(this.renderObject);
            else render.scene.add(this.renderObject);
        }
    }

};