// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import {AssetManager as BasicAssetManager} from "./assetManager.js";

import {ViewService} from "./worldcore";

export class AssetManager extends ViewService {
    constructor(name) {
        super(name || "AssetManager");
        this.assetManager = new BasicAssetManager();
    }
}

