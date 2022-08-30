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
        "lights.js", "hillside.js", "gridFloor.js", "ambientSound.js", "fadeIn.js", "circle.js"
    ];


    Constants.DefaultCards = [
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
                name: "ambient sound",
               // layers: ["light"],
                type: "sound",
                behaviorModules: ["AmbientSound"],
                dataType: "acc",
                dataLocation: "./assets/sounds/WindAmbience.aac",
                loop: true,
                volume: 0.1,
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
                name: "fadeIn card",
                behaviorModules: ["FadeIn"],
                layers: ["pointer"],
                type: "object"
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
        },
        {
            card: {
                dataLocation: "./assets/3D/temple_wmoss.glb",
                dataScale: [1,1,1],
                fileName: "/temple (1).glb",
                layers: [
                    "walk"
                ],
                modelType: "glb",
                name: "/temple (1).glb",
                rotation: [
                    0,
                    -0.8375393574138387,
                    0,
                    0.5463769987680797
                ],
                shadow: true,
                singleSided: true,
                translation: [
                    137.04842673287243,
                    -16.422857610412652,
                    215.58989538473676
                ],
                type: "3d"
            },
        }
    ];
}
