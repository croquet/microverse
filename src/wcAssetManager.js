import {AssetManager as BasicAssetManager} from "./assetManager.js";

import {ViewService} from "@croquet/worldcore";

export class AssetManager extends ViewService {
    constructor(name) {
        super(name || "AssetManager");
        this.assetManager = new BasicAssetManager();
    }

    destroy() {
        super.destroy();
    }
}
    
