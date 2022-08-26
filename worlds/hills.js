// hills.js
// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = [
        "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
    ];

    Constants.UserBehaviorDirectory = "behaviors/hillside";
    Constants.UserBehaviorModules = [
        "lights.js", "hillside.js", "gridFloor.js"
    ];

    const frameColor = 0x888888;

    Constants.DefaultCards = [
/*       {
            card: {
                name:"world model",
                behaviorModules: ["GridFloor"],
                layers: ["walk"],
                type: "object",
                translation:[0, -2, 0],
                shadow: true,
            }
        },   */
        {
            card: {
                name: "light",
                layers: ["light"],
                type: "lighting",
                behaviorModules: ["Lights"],
                dataType: "jpg",
                dataLocation: "./assets/sky/aboveClouds.jpg",
                clearColor: 0xaabbff,
            }
        },
        {
            card: {
                name: "image card",
                translation: [0, 0.4, -10],
                //rotation: [0, Math.PI / 2, 0],
                layers: ["pointer"],
                scale: [4, 4, 4],
                type: "2d",
                textureType: "image",
                textureLocation: "./assets/images/CroquetLogo_RGB.jpg",
                fullBright: true,
                frameColor: 0xcccccc,
                color: 0xffffff,
                cornerRadius: 0.05,
                depth: 0.05,
                shadow: true,
            }
        },
        {
            card: {
                name:"Hillside",
                behaviorModules: ["Hillside"],
                layers: ["terrain"],
                type: "object",
                translation:[0, 0, 0],
                shadow: true,
            }
        },
        {
            card:{
                translation: [14.323492647614785, -2.7804596526792222, -5.391810022345661],    
                rotation: [0, -0.01904446484351159, 0, 0.9998186377332763],    
                layers: ["walk"],    
                name: "/treepack4_small.glb",    
                dataLocation: "36bHrAibIhhNDw5QTWfleb-P1ufV9Gp4EKM28m0ss4iUXkJCRkUMGRlQX1pTRRhDRRhVRFlHQ1NCGF9ZGUMZYHp-UmwPBQdUcFVsckMHd19iAUJ4X3RCDlx8BBlfWRhVRFlHQ1NCGFJPWFdAU0RFUxlQZlFiYnJBQEIEAldxD1VnRUcHbHppUgN6blJjUXpvT3xVZ0J7bm5_ckZ_GVJXQlcZY29dBAJQYQFHfVdnWXxRUw4CbmZbZntpY0R9WHlPV1xaeX9RaUQBBhtUUQ",    
                dataScale: [1.5, 1.5, 1.5],    
                fileName: "/treepack4_small.glb",    
                modelType: "glb",    
                shadow: true,    
                singleSided: true,    
                type: "3d",
            }
        }
    ];
}
