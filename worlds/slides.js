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
        "lights.js", "slides.js", "collider.js"
    ];

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
        {
            card: {
                name:"Imported Box",
                type: "object",
                layers: ["pointer"],
                translation:[4, 0.4, -10],
                behaviorModules: ["Slides"],
                shadow: true,
                slides: ["3Ty3Bbs4szi78KqNTyGrH0FVMEqE023P_eSIBhC8knE4PCAgJCdue3syPTgxJ3ohJ3o3JjslITEgej07eyF7EzACNi04HScVPwU3FgwwZxMsNSItIwEfAw0NZns9O3o3JjslITEgejk9NyY7IjEmJzF7PTs9AQIbOwY-Ag1mI2YtMTdjAy44GGxhGBsmHQU-AT4cMCYSImAcGSBnZHswNSA1exIeHBALYiMgPBcAYxwtYh0CBAQ_G2EyYx8sEm0WFjsOFSNiDDItAGMhNxk", "3V_rhbXp8a1PLyayumtWeAAGGfyLTKjRrD4suceOjMuoPiIiJiVseXkwPzozJXgjJXg1JDknIzMieD85eSN5ETIANC86HyUXPQc1FA4yZREuNyAvIQMdAQ8PZHk_OXg1JDknIzMieDs_NSQ5IDMkJTN5Pzk_AwAZOQQ8AA9kIWQvMzVhASw6Gm5jGhkkHwc8AzweMiQQIGIeGyJlZnkyNyI3eT00JBoDOWACJxcHFC4OBQljGCM8GwEsPyAbHhwkBxsEbgEzARIkIBIFZxM"],
            }
        },
    ];
}
