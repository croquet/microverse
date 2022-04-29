// demoWorld2.js
// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = [
        "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
    ];

    Constants.SystemBehaviorDirectory = "behaviors/croquet";
    Constants.SystemBehaviorModules = [
        "menu.js", "elected.js", "propertySheet.js"
    ];

    Constants.UserBehaviorDirectory = "behaviors/demoWorld";
    Constants.UserBehaviorModules = [
        "lights.js", "gridFloor.js", "joeTheBox.js"
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
                name:"Joe the Box",
                behaviorModules: ["JoeTheBox"],
                layers: ["pointer"],
                type: "object",
                translation:[-4, 0.4, -10],
                //rotation:[0, Math.pi/4, 0],
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
                translation: [8, 0.4, -5],
                rotation: [0, -Math.PI / 2, 0],
                type: "2d",
                layers: ["pointer"],
                color: 0xFF66CC,
                frameColor: frameColor,
                width: 2,
                height: 2,
                depth: 0.05,
                cornerRadius: 0.05,
                multiuser: true,
                targetURL: "?world=portal1&q=llepplm7k3#pw=YAv65WDiOrW7jFMVSACd6g",
            }
        },
    ];
}
