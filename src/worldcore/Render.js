import { ViewService } from "./Root";


//------------------------------------------------------------------------------------------
//-- PM_Visible  ---------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_Visible = superclass => class extends superclass {

    destroy() {
        super.destroy();
        const render = this.service("RenderManager");
        for (const layerName in render.layers) {
            const layer = render.layers[layerName];
            if (layer.has(this)) render.dirtyLayer(layerName);
            render.layers[layerName].delete(this);
        }
    }

    addToLayers(...names) {
        const render = this.service("RenderManager");
        names.forEach(name => {
            if (!render.layers[name]) render.layers[name] = new Set();
            render.layers[name].add(this);
            render.dirtyLayer(name);
        });
    }

    removeFromLayers(...names) {
        const render = this.service("RenderManager");
        names.forEach(name => {
            if (!render.layers[name]) return;
            render.layers[name].delete(this);
            if (render.layers[name].size === 0) {
                delete render.layers[name];
            }
            render.dirtyLayer(name);
        });
    }

    layers() {
        let result = [];
        const render = this.service("RenderManager");
        for (const layerName in render.layers) {
            const layer = render.layers[layerName];
            if (layer.has(this)) result.push(layerName);
        }
        return result;
    }        
};

//------------------------------------------------------------------------------------------
//-- PM_Camera -----------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export const PM_Camera = superclass => class extends superclass {};

//------------------------------------------------------------------------------------------
//-- RenderManager -------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

export class RenderManager extends ViewService {
    constructor(options = {}, name) {
        super(name);
        this.registerViewName("RenderManager"); // Alternate generic name
        this.layers = {};
    }

    dirtyLayer(name) {} // Renderer can use this to trigger a rebuild of renderer-specific layer data;

}
