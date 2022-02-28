// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

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
    
