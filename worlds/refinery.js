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
        "demo.js", "bitcoinTracker.js", "flightTracker.js", "spin.js", "lights.js",
        "slides.js", "cascade.js", "bouncingBall.js"
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
                name: "text editor",
                className: "TextFieldActor",
                translation: [-4, cardHeight, -12],
                rotation: [0, Math.PI / 2, 0],
                multiuser: true,
                depth: 0.05,
                type: "text",
                runs: [{text: "hello"}],
                margins: {left: 20, top: 20, right: 20, bottom: 20},
                backgroundColor: 0xf4e056,
                //color: 0xf4e056,
                frameColor: frameColor,
                width: 2,
                height: 2,
                textScale: 0.002,
                shadow: true,
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
                frameColor: 0x888888,
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
                translation: [-4, cardHeight, -29],
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
                name:"bouncinglogo",
                translation: [-4, cardHeight, -35],
                rotation: [0, Math.PI / 2, 0],
                behaviorModules: ["BouncingBall"],
                scale: [4, 4, 4],
                width: 1,
                height: 1,
                layers: ["pointer"],
                multiuser: true,
                type: "2d",
                dataLocation: "./assets/SVG/full-circle.svg",
                textureType: "dynamic",
                textureWidth: 1024,
                textureHeight: 1024,
                frameColor: frameColor,
                color: 0xffffff,
                depth: 0.05,
                fullBright: true,
            }
        },
        {
            card: {
                translation: [-4, cardHeight, -40],
                scale: [4, 4, 4],
                rotation: [0, Math.PI / 2, 0],
                layers: ["pointer"],
                behaviorModules: ["PDFView"],
                name: "/22.05.23 Croquet AWE Presentation.pdf",
                color: 8947848,
                depth: 0.05,
                fileName: "/22.05.23 Croquet AWE Presentation.pdf",
                frameColor: 16777215,
                fullBright: true,
                modelType: "pdf",
                pdfLocation: "30zU7vniWF26Egbynrz8yyHD0fxWZ_FQC2-_h4Aqo768WEREQEMKHx9WWVxVQx5FQx5TQl9BRVVEHllfH0Ufd1RmUklceUNxW2FTcmhUA3dIUUZJR2V7Z2lpAh9ZXx5TQl9BRVVEHl1ZU0JfRlVCQ1UfHQhbQgABCXxJZERhU2kGfF5famIdWVFjeQUESV9de3p0AG9dCQRUd2NpeR9UUURRHwUJXmlkSmdpeWUFeVZIAAdBAXl3fGBYXgZDWWVvdGcJVVt8d19FdgMBUVM",
                shadow: true,
                singleSided: true,
                type: "2d",
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
                translation: [8, -0.5, 4],
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
                frameColor: frameColor,
            }
        },
        {
            card: {
                name:"flamingo model",
                dataTranslation: [0, 3, 0],
                type: "3d",
                dataLocation: "./assets/3D/Flamingo.glb.zip",
                behaviorModules: ["Circle"]
            }
        },
        {
            card: {
                name: "bitcointracker",
                translation: [-4, cardHeight, -6],
                rotation: [0, Math.PI / 2, 0],
                scale: [4, 4, 4],
                type: "2d",
                textureType: "canvas",
                textureWidth: 1024,
                textureHeight: 768,
                width: 1,
                height: 0.75,
                frameColor: frameColor,
                // color: 0xffffff,
                depth: 0.05,
                cornerRadius: 0.1,
                behaviorModules: ["Elected", "BitcoinTracker"],
            },
            id: "main",
        },
        {
            card: {
                name:"bitlogo",
                translation: [-0.35, 0.35, 0.1],
                scale: [0.25, 0.25, 0.25],
                parent: "main",
                type: "2d",
                dataLocation: "./assets/SVG/BitcoinSign.svg",
                depth: 0.05,
                color: 0xffffff,
                frameColor: frameColor,
                behaviorModules: ["BitLogo"]
            }
        },



        
        {
            card: {
                name:"bar graph",
                translation:[0, -0.3, 0.1],
                color: 0xEEEEEE,
                frameColor: frameColor,
                type: "object",
                height: 0.4,
                parent: "main",
                behaviorModules: ["BarGraph"],
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
