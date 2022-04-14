// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.MaxAvatars = 6;
    Constants.AvatarNames = [
        "alice", "newwhite", "fixmadhatter", "marchhare", "queenofhearts", "cheshirecat",
        "generic/1", "generic/2", "generic/3", "generic/4", "generic/5", "generic/6",
    ];

    Constants.SystemBehaviorDirectory = "behaviors/croquet";
    Constants.SystemBehaviorModules = [
        "menu.js", "elected.js", "propertyPanel.js"
    ];

    Constants.UserBehaviorDirectory = "behaviors/default";
    Constants.UserBehaviorModules = [
        "lights.js", "spin.js"
    ];

    const frameColor = 0xFF0000;

    Constants.DefaultCards = [
        {
            card: {
                name:'world model',
                translation:[0, -10, -60],
                scale:[200, 200, 200],
                rotation: [0, Math.PI, 0],
                layers: ['walk'],
                type: "3d",
                dataLocation: "./assets/3D/Oil Refinery_040522_2.glb.zip",
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
                // dataLocation: "./assets/sky/abandoned_parking_4k.jpg",
                // dataType: "jpg",
                dataLocation: "./assets/sky/syferfontein_1d_clear_1k.exr",
                dataType: "exr",
            }
        },
        {
            card: {
                name: 'portal',
                className: "PortalActor",
                translation: [0, 0, 0],
                rotation: [0, 0, 0],
                depth: 0.05,
                type: "2d",
                layers: ['pointer'],
                behaviorModules: ["Spin"],
                // textureType: "image",
                // textureLocation: './assets/images/earthbase.png',
                color: 0xFF66CC,
                frameColor: frameColor,
                width: 20,
                height: 20,
                cornerRadius: 0.05,
                shadow: true,
                targetURL: "?world=default&q=h3x7g3sfvt#pw=uc0HfetkENTP3aaHou-kOQ",
            }
        },
    ];
}
