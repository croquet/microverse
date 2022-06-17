// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = [
        "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
    ];

    Constants.SystemBehaviorDirectory = "behaviors/croquet";
    Constants.SystemBehaviorModules = [
        "menu.js", "elected.js", "propertySheet.js", "stickyNote.js", "avatarEvents.js"
    ];

    Constants.UserBehaviorDirectory = "behaviors/default";
    Constants.UserBehaviorModules = [
        "lights.js", "spin.js"
    ];

    const frameColor = 0xFF0000;

    Constants.DefaultCards = [
        {
            card: {
                name:"world model",
                dataScale:[1,1,1],
                translation:[22,-1.7,-20],
                rotation: [0, Math.PI, 0],
                layers: ["walk"],
                type: "3d",
                // dataLocation: "./assets/3D/oilrefinery_042122.glb.zip",
                singleSided: true,
                shadow: true,

                placeholder: true,
                placeholderSize: [100, 0.1, 100],
                placeholderColor: 0xcccccc,
                placeholderOffset: [0, 0, 0],
            }
        },
        {
            card: {
                name: "light",
                layers: ["light"],
                type: "lighting",
                behaviorModules: ["Light"],
                // dataType: "jpg",
                dataLocation: "3_wahIkaYt2Ia1fBw15YElIVBh53D-167gvt2nB8HRLsR1tbX1wVAABJRkNKXAFaXAFMXUBeWkpbAUZAAFoAaEt5TVZDZlxuRH5MbXdLHGhXTllWWHpkeHZ2HQBGQAFMXUBeWkpbAUJGTF1AWUpdXEoAHWJHZmt1eEpFRkxIex5eGEtgVRlrWkR9d0ZibR4CRkVkbGsdYXZLQmRNZgBLTltOAGNMGWcaQ2Z2GnpoSl8CeH11TlkaHkRqHH1jShtXAkJDWEtmHHtBbUlcbnY",
                dataType: "exr",
                fileName: "/syferfontein_1d_clear_1k.exr"
            }
        },
        {
            card: {
                name: "portal",
                className: "PortalActor",
                translation: [0, 0, -5],
                rotation: [0, 0, 0],
                type: "2d",
                layers: ["pointer", "portal"],
                behaviorModules: ["Spin"],
                // textureType: "image",
                // textureLocation: "./assets/images/earthbase.png",
                color: 0xFF66CC,
                frameColor: frameColor,
                width: 4,
                height: 4,
                depth: 0.2,
                cornerRadius: 0.05,
                shadow: true,
                portalURL: "?world=default",
                sparkle: true,
            }
        },
    ];
}
