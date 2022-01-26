/* globals Croquet THREE */

import {AssetManager} from "./src/assetManager.js";
import {loadThreeJSLib} from "./src/ThreeJSLibLoader.js";

class DropModel extends Croquet.Model {
    init() {
        this.assets = new Map();
        this.subscribe(this.id, "fileUploaded", "fileUploaded");
    }

    fileUploaded(data) {
        let {dataId} = data;
        console.log(data);
        this.assets.set(dataId, dataId);
        this.publish(this.id, "fileLoadRequested", dataId);
    }
}

DropModel.register("DropModel");

class DropView extends Croquet.View {
    constructor(model) {
        super(model);
        this.model = model;
        this.assetManager = new AssetManager();
        this.assetManager.setSessionId(this.sessionId);

        this.assetManager.setupHandlersOn(window, ({buffer, fileName}) => {
            return Croquet.Data.store(this.sessionId, buffer, true).then((handle) => {
                let dataId = Croquet.Data.toId(handle);
                this.assetManager.assetCache[dataId] = {buffer};
                this.publish(this.model.id, "fileUploaded", {dataId, fileName});
            });
        });

        let libs = [
            "loaders/OBJLoader.js",
            "loaders/MTLLoader.js"
        ];

        libs.map(loadThreeJSLib);
        
        this.subscribe(this.model.id, "fileLoadRequested", "fileLoadRequested");
    }

    fileLoadRequested(dataId) {
        let handle = Croquet.Data.fromId(dataId);
        Croquet.Data.fetch(this.sessionId, handle).then((buffer) => {
            let obj = this.assetManager.load(buffer, window.THREE);
        });
    }
}

function start() {
    const joinArgs = {
        appId: 'io.croquet.droptest',
        apiKey: "1_k2xgbwsmtplovtjbknerd53i73otnqvlwwjvix0f",
        name: "foo",
        password: 'dummy-pass',
        model: DropModel,
        view: DropView,
        autoSleep: false,
        tps: 4,
    };
    Croquet.Session.join(joinArgs);
}
start();
