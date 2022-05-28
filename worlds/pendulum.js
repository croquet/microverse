// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = [
        "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
    ];

    Constants.SystemBehaviorDirectory = "behaviors/croquet";
    Constants.SystemBehaviorModules = [
        "rapier.js", "avatar.js"
    ];

    Constants.UserBehaviorDirectory = "behaviors/pendulum";
    Constants.UserBehaviorModules = [
        "lights.js", "pendulum.js"
    ];

    // const frameColor = 0x888888;

    Constants.UseRapier = true;

    Constants.DefaultCards = [
        {
            card: {
                name:"world model",
                layers: ["walk"],
                type: "3d",
                translation:[0, -1.7, 0],
                singleSided: true,
                shadow: true,
                placeholder: true,
                placeholderSize: [400, 0.1, 400],
                placeholderColor: 0x808080,
                placeholderOffset: [0, 0, 0],
            }
        },
        {
            card: {
                name: "light",
                layers: ["light"],
                type: "lighting",
                behaviorModules: ["Light"],
                dataLocation: "./assets/sky/abandoned_parking_4k.jpg",
                dataType: "jpg",
            }
        },
        {
            card: {
                name:"pendulum",
                translation: [0, 5, -20],
                type: "object",
                behaviorModules: ["Rapier", "Pendulum"],
                layers: ["pointer"],
                multiuser: true,
                color: 0xaaaaaa,
            }
        },
        
    ];
}
