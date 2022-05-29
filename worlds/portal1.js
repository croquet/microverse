// tutorial2.js
// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = [
        "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
    ];

    Constants.SystemBehaviorDirectory = "behaviors/croquet";
    Constants.SystemBehaviorModules = [
        "menu.js", "propertySheet.js", "stickyNote.js", "avatarEvents.js"
    ];

    Constants.UserBehaviorDirectory = "behaviors/default";
    Constants.UserBehaviorModules = [
        "lights.js"
    ];

    const frameColor = 0x888888;

    Constants.DefaultCards = [
        {
            card: {
                name:"world model",
                type: "3d",
                dataLocation: "./assets/3D/artgallery_042122.glb.zip",
                singleSided: true,
                shadow: true,
                layers: ["walk"],
                translation:[0, -1.7, 0],
                dataScale:[1,1,1],
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
                dataLocation: "./assets/sky/shanghai_riverside_2k.exr",
                dataType: "exr",
            }
        },
        {
            card: {
                name: "image card",
                translation: [0, 0.4, -10],
                //rotation: [0, Math.PI / 2, 0],
                scale: [4, 4, 4],
                type: "2d",
                textureType: "image",
                textureLocation: "./assets/images/CroquetLogo_RGB.jpg",
                fullBright: true,
                frameColor: 0xcccccc,
                color: 0xbbbbbb,
                cornerRadius: 0.05,
                depth: 0.05,
                shadow: true,
            }
        },
        {
            card: {
                name:"Imported Box",
                type: "3d",
                dataLocation: "./assets/3D/testcube_1m.glb.zip",
                layers: ["pointer"],
                translation:[4, 0.4, -10],
                dataScale:[1,1,1],
                //rotation:[0, Math.pi/4, 0],
                shadow: true,
            }
        },
        {
            card: {
                name: "portal",
                className: "PortalActor",
                translation: [11.9, 0, -5],
                rotation: [0, -Math.PI / 2, 0],
                type: "2d",
                layers: ["pointer", "portal"],
                color: 0xFF66CC,
                frameColor: frameColor,
                width: 2,
                height: 4,
                depth: 0.2,
                cornerRadius: 0.05,
                multiuser: true,
                portalURL: "?world=portal2",
                sparkle: true,
            }
        },
    ];
}
