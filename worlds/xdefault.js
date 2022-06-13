// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = [
        "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
    ];

    Constants.SystemBehaviorDirectory = "behaviors/croquet";
    Constants.SystemBehaviorModules = [
        "menu.js", "elected.js", "propertySheet.js", "stickyNote.js", "rapier.js", "avatarEvents.js", "pdfview.js", "editPose.js"
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
    const wallHeight = 3;
    const wallThick = 0.2;
    const bt = [-20, baseY, 64]; // bt for base translation

    const baseSize = [20, 1, 20];
    const half = baseSize[0] / 2;
    const wallBase = bt[1] + wallHeight / 2 + baseSize[1] / 2;

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
                behaviorModules: ["EditPose"],
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
                behaviorModules: ["EditPose"],
            }
        },

        /*

        {
            card: {
                name: "Perlin Demo",
                layers: ["pointer"],
                translation:[10, -1.62, -14],
                type: "object",
                behaviorModules: ["Perlin"],
                rotation:[ 0, -0.7071068, 0, 0.7071068 ],
            }
        },

        {
            card: {
                name: "video card",
                translation: [-4, -0.5, -24],
                rotation: [0, Math.PI / 2, 0],
                scale: [4, 4, 4],
                type: "2d",
                textureType: "video",
                textureLocation: "./assets/videos/fromPCtoHMD.mp4",
                textureWidth: 1024,
                textureHeight: 848,
                width: 2,
                height: 1.656,
                cornerRadius: 0.05,
                frameColor: frameColor,
                color: 0xffffff,
                depth: 0.05,
                fullBright: true
            }
        },
        */
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
                fullBright: false,
                behaviorModules: ["EditPose"],
            }
        },
        {
            card: {
                name: "multiblaster",
                className: "MultiBlaster",
                translation: [-4, cardHeight, -29],
                rotation: [0, Math.PI / 2, 0],
                scale: [4, 4, 4],
                layers: ["pointer"],
                multiuser: true,
                type: "2d",
                textureType: "canvas",
                textureWidth: 1024,
                textureHeight: 1024,
                frameColor: frameColor,
                cornerRadius: 0.05,
                color: 0xffffff,
                depth: 0.05,
                fullBright: true,
                behaviorModules: ["EditPose"],
            }
        },
        {
            card: {
                name:"bouncinglogo",
                translation: [-4, cardHeight, -35],
                rotation: [0, Math.PI / 2, 0],
                behaviorModules: ["BouncingBall", "EditPose"],
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
                name:"flightTracker",
                translation: [-4, 2, -50],
                type: "object",
                scale:[0.75,0.75,0.75],
                behaviorModules: ["Elected", "FlightTracker", "Spin", "EditPose"],
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
                behaviorModules: ["Circle", "EditPose"]
            }
        },
        {
            card: {
                name: "drive code editor",
                translation: [83, 0.2, -113],
                rotation: [0, -Math.PI / 2, 0],
                layers: ["pointer"],
                type: "code",
                behaviorModule: "Drive.DriveActor",
                textScale: 0.001,
                margins: {left: 32, top: 32, right: 32, bottom: 32},
                width: 1.5,
                height: 3.0,
                depth: 0.05,
                frameColor: frameColor,
            },
        },
        {
            card: {
                name: "spin code editor",
                translation: [83, 0, -115],
                rotation: [0, -Math.PI / 2, 0],
                layers: ["pointer"],
                type: "code",
                behaviorModule: "Spin.SpinActor",
                textScale: 0.001,
                margins: {left: 32, top: 32, right: 32, bottom: 32},
                width: 1.5,
                height: 1.7,
                depth: 0.05,
                frameColor: frameColor,
            },
        },
        {
            card: {
                name:"porsche",
                dataRotation: [-Math.PI / 2, 0, 0],
                translation: [82, -1.672, -110],
                layers: ["pointer"],
                behaviorModules:["EditPose"],
                type: "3d",
                multiuser: true,
                dataLocation: "3Rph2fVNkc0jhp42pQF7jVIX5t2yeugm3T6CFPV1F4c4OiYmIiFofX00Oz43IXwnIXwxID0jJzcmfDs9fSd9BB4aNghrYWMwFDEIFidjEzsGZSYcOxAmajgYYH07PXwxID0jJzcmfD87MSA9JDcgITd9EyUlJhYaBj8oOzFnOTocMCEwNjZ_OgZiATQGOgE_OD0BZgU9ZR4iAjoIOX02MyYzfTwzaio-MyE7NA07NT8KFQVrNWATYAA7GRllYWMFEBhiJQskIj8xfyM9ZmI",
                behaviorModules: ["Drive"]
            }
        },
        {
            card: {
                name:"earth",
                translation: [84, 1.25, -120],
                scale: [0.5, 0.5, 0.5],
                type: "object",
                behaviorModules: ["FlightTracker", "Spin", "EditPose"],
                layers: ["pointer"],
                multiuser: true,
                color: 0xaaaaaa,
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
                behaviorModules: ["Elected", "BitcoinTracker", "EditPose"],
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
                behaviorModules: ["Rapier", "Cascade", "EditPose"],
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
                behaviorModules: ["Rapier", "Cascade", "EditPose"],
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
                translation: [bt[0], -2.11649335743053, bt[2] - 22.29],
                rotation: [0, 0, 0],
                behaviorModules: ["Rapier", "Cascade", "EditPose"],
                rapierSize: [baseSize[0], baseSize[1], baseSize[2] / 3],
                color: 0x997777,
                rapierShape: "cuboid",
                rapierType: "positionBased",
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
                behaviorModules: ["Spray", "Rapier", "Cascade", "EditPose"],
                rapierSize: [1, 1, 1],
                rapierShape: "cuboid",
                rapierType: "positionBased",
                color: 0xcccccc,
                shadow: true,
            }
        },
        {
            card: {
                name:"wooden box",
                type: "object",
                multiuser: true,
                layers: ["pointer"],
                translation:[bt[0] + 2, 0.5, bt[2] - 1],
                behaviorModules: ["Slides", "EditPose"],
                rapierSize: [1, 1, 1],
                rapierShape: "cuboid",
                shadow: true,
                slides: ["3Ty3Bbs4szi78KqNTyGrH0FVMEqE023P_eSIBhC8knE4PCAgJCdue3syPTgxJ3ohJ3o3JjslITEgej07eyF7EzACNi04HScVPwU3FgwwZxMsNSItIwEfAw0NZns9O3o3JjslITEgejk9NyY7IjEmJzF7PTs9AQIbOwY-Ag1mI2YtMTdjAy44GGxhGBsmHQU-AT4cMCYSImAcGSBnZHswNSA1exIeHBALYiMgPBcAYxwtYh0CBAQ_G2EyYx8sEm0WFjsOFSNiDDItAGMhNxk", "3V_rhbXp8a1PLyayumtWeAAGGfyLTKjRrD4suceOjMuoPiIiJiVseXkwPzozJXgjJXg1JDknIzMieD85eSN5ETIANC86HyUXPQc1FA4yZREuNyAvIQMdAQ8PZHk_OXg1JDknIzMieDs_NSQ5IDMkJTN5Pzk_AwAZOQQ8AA9kIWQvMzVhASw6Gm5jGhkkHwc8AzweMiQQIGIeGyJlZnkyNyI3eT00JBoDOWACJxcHFC4OBQljGCM8GwEsPyAbHhwkBxsEbgEzARIkIBIFZxM"],
            }
        },
    ];
}
