// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

import { Model, Constants } from "@croquet/worldcore";
import { startWorld } from "./root.js";

Constants.MaxAvatars = 6;
Constants.AvatarNames = [
    "generic/1", "generic/2", "generic/3", "generic/4", "generic/5", "generic/6",
    "alice", "newwhite", "fixmadhatter", "marchhare", "queenofhearts", "cheshirecat"
];

Constants.SystemBehaviorDirectory = "croquet";
Constants.SystemBehaviorModules = [
    "menu.js", "elected.js", "propertyPanel.js"
];

Constants.UserBehaviorDirectory = "defaultDemo";
Constants.UserBehaviorModules = [
    "demo.js",  "bitcoinTracker.js", "bridge.js", "spin.js"
];

// use bit-identical math for constant initialization
Model.evaluate( () => {
    Constants.DefaultCards = [
        {
            card: {
                name:'world model',
                translation:[25, -90.5, -60],
                scale:[200, 200, 200],
                rotation: [0, Math.PI, 0],
                layers: ['walk'],
                type: "3d",
                // dataLocation: "./assets/3D/Oil Refinery Kai Fixes4.glb.zip",
                singleSided: true,
                shadow: true,
                placeholder: true,
                placeholderSize: [40, 1, 40],
                placeholderColor: 0x808080,
                placeholderOffset: [0, -0.065, 0],
            }
        },
        {
            card: {
                name: 'lighting #1',
                type: "lighting",
                className: "DLight",
            }
        },

        {
            card: {
                name:'simple 3D model',
                translation: [-0, -0.5, -18],
                rotation: [Math.PI / 2, 0, 0],
                type: "3d",
                dataLocation: "./assets/3D/Gears.glb.zip",
                shadow: true,
                singleSided: true,
            }
        },
        
    ];
}); // end of Model.evaluate()

// Default parameters are filled in the body of startWorld
startWorld({
    appId: 'io.croquet.microverse',
    apiKey: '1_nsjqc1jktrot0iowp3c1348dgrjvl42hv6wj8c2i',
    tps: 30,
    eventRateLimit: 60,
}).then(() => {
    console.log(`
  ________  ____  ____  __  ____________
 / ___/ _ \\/ __ \\/ __ \\/ / / / __/_  __/
/ /__/ , _/ /_/ / /_/ / /_/ / _/  / /
\\___/_/|_|\\____/\\___\\_\\____/___/ /_/
`);
});
