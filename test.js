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

    Constants.UserBehaviorDirectory = "behaviors/default";
    Constants.UserBehaviorModules = [
        "lights.js"
    ];

    const frameColor = 0x888888;

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
                    name: 'light',
                    layers: ['light'],
                    type: "lighting",
                    behaviorModules: ["Light"],
                    dataLocation: "./assets/sky/oberer_kuhberg_4k.jpg",
                    dataType: "jpg",
                }
            },
        ];
    }); // end of Model.evaluate()
}
