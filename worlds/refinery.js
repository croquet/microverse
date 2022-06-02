// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = [
        "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
    ];

    Constants.SystemBehaviorDirectory = "behaviors/croquet";
    Constants.SystemBehaviorModules = [
        "menu.js", "elected.js", "propertySheet.js", "stickyNote.js", "rapier.js", "avatarEvents.js", "pdfview.js"
    ];

    Constants.UserBehaviorDirectory = "behaviors/default";
    Constants.UserBehaviorModules = [
        "demo.js", "flightTracker.js", "spin.js", "lights.js",
        "slides.js", "cascade.js"
    ];

    Constants.UseRapier = true;

    const frameColor = 0x888888;
    const cardHeight = 0.5;

    const baseY = 6;
    const bt = [-20, baseY, 64]; // bt for base translation

    const baseSize = [20, 1, 20];

    Constants.DefaultCards = [
        {
            card: {
                name:"world model",
                dataScale:[1,1,1],
                translation:[22,-1.7,-20],
                rotation: [0, Math.PI, 0],
                layers: ["walk"],
                type: "3d",
                dataLocation: "./assets/3D/oilrefinery_042122.glb.zip",
                singleSided: true,
                shadow: true,

                placeholder: true,
                placeholderSize: [100, 0.01, 100],
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
                dataLocation: "./assets/sky/abandoned_parking_4k.jpg",
                dataType: "jpg",
            }
        },
        {
            card: {
                name:"simple 3D model",
                translation: [-4, cardHeight, -18],
                type: "3d",
                dataLocation: "./assets/3D/Gears.glb.zip",
                dataRotation: [Math.PI / 2, Math.PI / 2, 0],
                shadow: true,
                singleSided: true,
            }
        },
        {
            card: {
                name: "image card",
                translation: [-4, cardHeight, -23],
                rotation: [0, Math.PI / 2, 0],
                scale: [4, 4, 4],
                type: "2d",
                textureType: "image",
                textureLocation: "./assets/images/Colony.png",
                frameColor,
                color: 0xffffff,
                cornerRadius: 0.05,
                depth: 0.05,
                fullBright: false
            }
        },
        {
            card: {
                name: "portal",
                className: "PortalActor",
                translation: [-4, 0, -29],
                rotation: [0, Math.PI / 2, 0],
                type: "2d",
                layers: ["pointer", "portal"],
                color: 0xFF66CC,
                frameColor: frameColor,
                width: 4,
                height: 4,
                depth: 0.2,
                cornerRadius: 0.05,
                shadow: true,
                multiuser: true,
                portalURL: "?world=default",
                sparkle: false,
            }
        },
        {
            card: {
                name:"flightTracker",
                translation: [-4, 2, -50],
                type: "object",
                scale:[0.75,0.75,0.75],
                behaviorModules: ["Elected", "FlightTracker", "Spin"],
                layers: ["pointer"],
                multiuser: true,
                color: 0xaaaaaa,
            }
        },
        {
            card: {
                name:"code editor",
                translation: [8, -0.5, -8],
                rotation: [0, -Math.PI / 2, 0],
                layers: ["pointer"],
                type: "code",
                behaviorModule: "Circle.CircleActor",
                margins: {left: 32, top: 32, right: 32, bottom: 32},
                // margins: {left: 16, top: 16, right: 16, bottom: 16},
                textScale: 0.001,
                width: 1.5,
                height: 2,
                depth: 0.05,
                fullBright: true,
                frameColor: frameColor,
            }
        },
        {
            card: {
                name:"flamingo model",
                dataTranslation: [0, 3, 0],
                translation: [0, 0, -8],
                type: "3d",
                dataLocation: "./assets/3D/Flamingo.glb.zip",
                behaviorModules: ["Circle"]
            }
        },
        {
            card: {
                name:"base",
                type: "object",
                layers: ["pointer", "walk"],
                rotation: [-Math.PI / 6, 0, 0],
                translation: bt,
                behaviorModules: ["Rapier", "Cascade"],
                rapierSize: baseSize,
                color: 0x997777,
                rapierShape: "cuboid",
                rapierType: "positionBased",
                shadow: true,
            }
        },
        {
            card: {
                name:"base 2",
                type: "object",
                layers: ["pointer", "walk"],
                translation: [bt[0], -0.30484568847637494, bt[2] - 11.772],
                rotation: [-Math.PI / 8, 0, 0],
                behaviorModules: ["Rapier", "Cascade"],
                rapierSize: [baseSize[0], baseSize[1], baseSize[2] / 3],
                color: 0x997777,
                rapierShape: "cuboid",
                rapierType: "positionBased",
                shadow: true,
            }
        },
        {
            card: {
                name:"base 3",
                type: "object",
                layers: ["pointer", "walk"],
                translation: [bt[0], -2.11649335743053, bt[2] - 21.18],
                rotation: [0, 0, 0],
                behaviorModules: ["Rapier", "Cascade"],
                rapierSize: [baseSize[0] * 0.5, baseSize[1], baseSize[2] * 0.3],
                color: 0x997777,
                rapierShape: "cuboid",
                rapierType: "positionBased",
                shadow: true,
            }
        },
        {
            card: {
                name:"init box",
                type: "object",
                layers: ["pointer"],
                translation: [bt[0], -1.11649335743053, bt[2] - 20.80],
                rotation: [0, 0, 0],
                behaviorModules: ["Rapier", "Cascade"],
                rapierSize: [1, 1, 1],
                rapierShape: "cuboid",
                color: 0xa2d490,
                shadow: true,
            }
        },
        {
            card: {
                name:"spray",
                type: "object",
                layers: ["pointer"],
                multiuser: true,
                translation: [bt[0], 20, bt[2] + 2],
                behaviorModules: ["Spray", "Rapier", "Cascade"],
                rapierSize: [1, 1, 1],
                rapierShape: "cuboid",
                rapierType: "positionBased",
                color: 0xcccccc,
                shadow: true,
            }
        },
    ];
}
