// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = [
        "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
    ];

    Constants.SystemBehaviorDirectory = "behaviors/croquet";
    Constants.SystemBehaviorModules = [
        "menu.js", "elected.js", "propertySheet.js", "rapier.js"
    ];

    Constants.UserBehaviorDirectory = "behaviors/slides";
    Constants.UserBehaviorModules = [
        "lights.js", "slides.js", "collider.js", "flightTracker.js"
    ];

    Constants.UseRapier = true;

    // const frameColor = 0x888888;

    const baseY = -1;
    const wallHeight = 3;
    const wallThick = 0.2;
    const bt = [0, baseY, -20]; // bt for base translation
    const baseSize = [20, 1, 20];
    const half = baseSize[0] / 2;
    const wallBase = bt[1] + wallHeight / 2 + baseSize[1] / 2;

    Constants.DefaultCards = [
        {
            card: {
                name:"world model",
                layers: ["walk"],
                type: "3d",
                singleSided: true,
                shadow: true,
                placeholder: true,
                placeholderSize: [400, 1, 400],
                placeholderColor: 0x808080,
                placeholderOffset: [0, -1.7, 0],
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
                name:"base",
                type: "object",
                layers: ["pointer"],
                translation: bt,
                behaviorModules: ["Rapier", "Collider"],
                rapierSize: baseSize,
                color: 0xcc4444,
                rapierShape: "cuboid",
                rapierType: "positionBased",
                shadow: true,
            }
        },
        {
            card: {
                name:"base 1",
                type: "object",
                layers: ["pointer"],
                translation: [bt[0] - wallThick / 2, wallBase, bt[2] + half - wallThick / 2],
                behaviorModules: ["Rapier", "Collider"],
                rapierSize: [baseSize[0] - wallThick, wallHeight, wallThick],
                color: 0xbb6666,
                rapierShape: "cuboid",
                rapierType: "positionBased",
                shadow: true,
            }
        },
        {
            card: {
                name:"base 2",
                type: "object",
                layers: ["pointer"],
                translation: [bt[0] + half - wallThick / 2, wallBase, bt[2] + wallThick / 2],
                behaviorModules: ["Rapier", "Collider"],
                rapierSize: [wallThick, wallHeight, baseSize[0] - wallThick],
                color: 0xbb6666,
                rapierShape: "cuboid",
                rapierType: "positionBased",
                shadow: true,
            }
        },
        {
            card: {
                name:"base 3",
                type: "object",
                layers: ["pointer"],
                translation: [bt[0] + wallThick / 2, wallBase, bt[2] - half + wallThick / 2],
                behaviorModules: ["Rapier", "Collider"],
                rapierSize: [baseSize[0] - wallThick, wallHeight, wallThick],
                color: 0xbb6666,
                rapierShape: "cuboid",
                rapierType: "positionBased",
                shadow: true,
            }
        },
        {
            card: {
                name:"base 4",
                type: "object",
                layers: ["pointer"],
                translation: [bt[0] - half + wallThick / 2, wallBase, bt[2] - wallThick / 2],
                behaviorModules: ["Rapier", "Collider"],
                rapierSize: [wallThick, wallHeight, baseSize[0] - wallThick],
                color: 0xbb6666,
                rapierShape: "cuboid",
                rapierType: "positionBased",
                shadow: true,
            }
        },
        {
            card: {
                name:"c1",
                type: "object",
                layers: ["pointer"],
                translation: [bt[0] + 1, 20, bt[2] - 1],
                behaviorModules: ["Rapier", "Collider"],
                rapierSize: [1, 1, 1],
                rapierShape: "cuboid",
                color: 0xff0000,
                shadow: true,
            }
        },
        {
            card: {
                name:"c2",
                type: "object",
                layers: ["pointer"],
                translation: [bt[0] - 1, 19, bt[2]],
                behaviorModules: ["Rapier", "Collider"],
                rapierSize: [1, 1, 1],
                rapierShape: "cuboid",
                color: 0x00ff00,
                shadow: true,
            }
        },
        {
            card: {
                name:"c3",
                type: "object",
                layers: ["pointer"],
                translation: [bt[0], 25, bt[2] + 1],
                scale: [0.25, 0.25, 0.25],
                behaviorModules: ["Rapier", "Elected", "FlightTracker", "Collider"],
                rapierSize: 2,
                rapierShape: "ball",
                color: 0x0000ff,
                shadow: true,
            }
        },
        {
            card: {
                name:"wooden box",
                type: "object",
                layers: ["pointer"],
                translation:[bt[0] + 2, 22, bt[2] - 1],
                behaviorModules: ["Rapier", "Slides", "Collider"],
                rapierSize: [1, 1, 1],
                rapierShape: "cuboid",
                shadow: true,
                slides: ["3Ty3Bbs4szi78KqNTyGrH0FVMEqE023P_eSIBhC8knE4PCAgJCdue3syPTgxJ3ohJ3o3JjslITEgej07eyF7EzACNi04HScVPwU3FgwwZxMsNSItIwEfAw0NZns9O3o3JjslITEgejk9NyY7IjEmJzF7PTs9AQIbOwY-Ag1mI2YtMTdjAy44GGxhGBsmHQU-AT4cMCYSImAcGSBnZHswNSA1exIeHBALYiMgPBcAYxwtYh0CBAQ_G2EyYx8sEm0WFjsOFSNiDDItAGMhNxk", "3V_rhbXp8a1PLyayumtWeAAGGfyLTKjRrD4suceOjMuoPiIiJiVseXkwPzozJXgjJXg1JDknIzMieD85eSN5ETIANC86HyUXPQc1FA4yZREuNyAvIQMdAQ8PZHk_OXg1JDknIzMieDs_NSQ5IDMkJTN5Pzk_AwAZOQQ8AA9kIWQvMzVhASw6Gm5jGhkkHwc8AzweMiQQIGIeGyJlZnkyNyI3eT00JBoDOWACJxcHFC4OBQljGCM8GwEsPyAbHhwkBxsEbgEzARIkIBIFZxM"],
            }
        },
    ];
}
