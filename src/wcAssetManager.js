// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import {AssetManager as BasicAssetManager} from "./assetManager.js";

import {ViewService} from "./worldcore";

export class AssetManager extends ViewService {
    constructor(name) {
        super(name || "AssetManager");
        this._assetManager = new BasicAssetManager();
    }

    get assetManager() {
        if (this._assetManager) {
            let renderer = this.service("ThreeRenderManager").renderer;
            this._assetManager.renderer = renderer;
            return this._assetManager;
        }
    }
}
