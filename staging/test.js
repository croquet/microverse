// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Model, Constants) {
    Constants.MaxAvatars = 6;
    Constants.AvatarNames = [
        "generic/1", "generic/2", "generic/3", "generic/4", "generic/5", "generic/6",
        "alice", "newwhite", "fixmadhatter", "marchhare", "queenofhearts", "cheshirecat"
    ];

    Constants.SystemBehaviorDirectory = "behaviors/croquet";
    Constants.SystemBehaviorModules = [
        "menu.js", "elected.js", "propertyPanel.js"
    ];

    Constants.UserBehaviorDirectory = "behaviors/defaultDemo";
    Constants.UserBehaviorModules = [
        "demo.js", "bitcoinTracker.js", "bridge.js", "spin.js"
    ];

    // use bit-identical math for constant initialization
    Model.evaluate( () => {
        Constants.DefaultCards = [
            {
                card: {
                    name:'world model',
                    translation:[0, -10, -60],
                    scale:[200, 200, 200],
                    rotation: [0, Math.PI, 0],
                    layers: ['walk'],
                    type: "3d",
                    // dataLocation: "./assets/3D/Oil Refinery 6.glb.zip",
                    singleSided: true,
                    shadow: true,
                    placeholder: true,
                    placeholderSize: [40, 1, 40],
                    placeholderColor: 0x808080,
                    placeholderOffset: [0, -0.463, 0],
                    
                }
            },
            {
                card: {
                    name: 'lighting #1',
                    type: "lighting",
                    className: "DLight",
                    dataLocation: "./assets/sky/syferfontein_1d_clear_1k.exr"
                }
            },
            {
                card: {
                    name:'simple 3D model',
                    translation: [0, -0.5, -18],
                    rotation: [Math.PI / 2, 0, 0],
                    type: "3d",
                    dataLocation: "./assets/3D/Gears.glb.zip",
                    shadow: true,
                    singleSided: true,
                }
            },
        ];
    }); // end of Model.evaluate()
}
