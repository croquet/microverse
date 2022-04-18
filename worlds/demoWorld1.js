// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.MaxAvatars = 6;
    Constants.AvatarNames = [
        "generic/1", "generic/2", "generic/3", "generic/4", "generic/5", "generic/6",
        "alice", "newwhite", "fixmadhatter", "marchhare", "queenofhearts", "cheshirecat"
    ];

    Constants.SystemBehaviorDirectory = "behaviors/croquet";
    Constants.SystemBehaviorModules = [
        "menu.js", "elected.js", "propertySheet.js"
    ];

    Constants.UserBehaviorDirectory = "behaviors/demoWorld";
    Constants.UserBehaviorModules = [
        "lights.js", "gridFloor.js"
    ];

    // const frameColor = 0x888888;

    Constants.DefaultCards = [
        {
            card: {
                name:'world model',
                behaviorModules: ["GridFloor"],
                layers: ['walk'],
                type: "object",
                translation:[0, -4, 0],
                shadow: true,
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
            }
        },
    ];
}
