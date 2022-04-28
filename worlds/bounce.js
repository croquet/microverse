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
        /*
    // slides: ["3Ty3Bbs4szi78KqNTyGrH0FVMEqE023P_eSIBhC8knE4PCAgJCdue3syPTgxJ3ohJ3o3JjslITEgej07eyF7EzACNi04HScVPwU3FgwwZxMsNSItIwEfAw0NZns9O3o3JjslITEgejk9NyY7IjEmJzF7PTs9AQIbOwY-Ag1mI2YtMTdjAy44GGxhGBsmHQU-AT4cMCYSImAcGSBnZHswNSA1exIeHBALYiMgPBcAYxwtYh0CBAQ_G2EyYx8sEm0WFjsOFSNiDDItAGMhNxk", "3V_rhbXp8a1PLyayumtWeAAGGfyLTKjRrD4suceOjMuoPiIiJiVseXkwPzozJXgjJXg1JDknIzMieD85eSN5ETIANC86HyUXPQc1FA4yZREuNyAvIQMdAQ8PZHk_OXg1JDknIzMieDs_NSQ5IDMkJTN5Pzk_AwAZOQQ8AA9kIWQvMzVhASw6Gm5jGhkkHwc8AzweMiQQIGIeGyJlZnkyNyI3eT00JBoDOWACJxcHFC4OBQljGCM8GwEsPyAbHhwkBxsEbgEzARIkIBIFZxM"],
        {
            card: {
                name:"Imported Box",
                type: "object",
                layers: ["pointer"],
                translation:[4, 0.4, -10],
                dataScale:[1, 1, 1],
                behaviorModules: ["Slides"],
                //rotation:[0, Math.pi/4, 0],
                shadow: true,
                slides: ["3Ty3Bbs4szi78KqNTyGrH0FVMEqE023P_eSIBhC8knE4PCAgJCdue3syPTgxJ3ohJ3o3JjslITEgej07eyF7EzACNi04HScVPwU3FgwwZxMsNSItIwEfAw0NZns9O3o3JjslITEgejk9NyY7IjEmJzF7PTs9AQIbOwY-Ag1mI2YtMTdjAy44GGxhGBsmHQU-AT4cMCYSImAcGSBnZHswNSA1exIeHBALYiMgPBcAYxwtYh0CBAQ_G2EyYx8sEm0WFjsOFSNiDDItAGMhNxk"],
            }
        },
        */
        {
            card: {
                name:"base",
                type: "object",
                layers: ["pointer"],
                translation: [0, 0, -20],
                behaviorModules: ["Rapier", "Collider"],
                rapierSize: [20, 1, 20],
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
                translation: [0.5, 1.5, -10.5],
                behaviorModules: ["Rapier", "Collider"],
                rapierSize: [19, 2, 1],
                color: 0xdd4444,
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
                translation: [9.5, 1.5, -20.5],
                behaviorModules: ["Rapier", "Collider"],
                rapierSize: [1, 2, 19],
                color: 0xdd4444,
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
                translation: [-0.5, 1.5, -29.5],
                behaviorModules: ["Rapier", "Collider"],
                rapierSize: [19, 2, 1],
                color: 0xdd4444,
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
                translation: [-9.5, 1.5, -19.5],
                behaviorModules: ["Rapier", "Collider"],
                rapierSize: [1, 2, 19],
                color: 0xdd4444,
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
                translation: [1, 20, -20],
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
                translation: [-1, 20, -20],
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
                translation: [0, 25, -21],
                scale: [0.25, 0.25, 0.25],
                behaviorModules: ["Rapier", "FlightTracker", "Collider"],
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
                translation:[2, 20, -20],
                behaviorModules: ["Rapier", "Slides", "Collider"],
                rapierSize: [1, 1, 1],
                rapierShape: "cuboid",
                shadow: true,
                slides: ["3Ty3Bbs4szi78KqNTyGrH0FVMEqE023P_eSIBhC8knE4PCAgJCdue3syPTgxJ3ohJ3o3JjslITEgej07eyF7EzACNi04HScVPwU3FgwwZxMsNSItIwEfAw0NZns9O3o3JjslITEgejk9NyY7IjEmJzF7PTs9AQIbOwY-Ag1mI2YtMTdjAy44GGxhGBsmHQU-AT4cMCYSImAcGSBnZHswNSA1exIeHBALYiMgPBcAYxwtYh0CBAQ_G2EyYx8sEm0WFjsOFSNiDDItAGMhNxk", "3V_rhbXp8a1PLyayumtWeAAGGfyLTKjRrD4suceOjMuoPiIiJiVseXkwPzozJXgjJXg1JDknIzMieD85eSN5ETIANC86HyUXPQc1FA4yZREuNyAvIQMdAQ8PZHk_OXg1JDknIzMieDs_NSQ5IDMkJTN5Pzk_AwAZOQQ8AA9kIWQvMzVhASw6Gm5jGhkkHwc8AzweMiQQIGIeGyJlZnkyNyI3eT00JBoDOWACJxcHFC4OBQljGCM8GwEsPyAbHhwkBxsEbgEzARIkIBIFZxM"],
            }
        },
        
    ];
}
