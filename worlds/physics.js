// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = ["newwhite"];

    /* Alternatively, you can specify a card spec for an avatar,
       instead of a string for the partical file name, to create your own avatar.
       You can add behaviorModules here. Also, if the system detects a behavior module
       named AvatarEventHandler, that is automatically installed to the avatar.
        {
            type: "3d",
            modelType: "glb",
            name: "rabbit",
            dataLocation: "./assets/avatars/newwhite.zip",
            dataRotation: [0, Math.PI, 0],
            dataScale: [0.3, 0.3, 0.3],
        }
    */

    // rotates an object around a center point.
    function rotateTo(center, length, angle){
        let pos = [];
        pos.push(length*Math.sin(angle));
        pos.push(0);
        pos.push(length*Math.cos(angle));
        pos[0]+=center[0];
        pos[1]=center[1];
        pos[2]+=center[2];
        return pos;
    }

    Constants.UserBehaviorDirectory = "behaviors/physics";
    Constants.UserBehaviorModules = [
        "lights.js", "cascade.js", "earth.js", "gridBlock.js", "gridSphere.js", "pool.js", "spin.js", 
        "urlLink.js", "replaceWorld.js", "menus.js"
    ];
    Constants.DefaultCards = [
        {
            card: {
                name:"world model",
                layers: ["walk"],
                type: "3d",
                singleSided: true,
                shadow: true,
                translation:[0, -1.7, 0],
                placeholder: true,
                placeholderSize: [400, 0.1, 400],
                placeholderColor: 0x808080,
                placeholderOffset: [0, 0, 0],
                behaviorModules: ["Menus"],
            }
        },
        {
            card: {
                name: "light",
                layers: ["light"],
                type: "lighting",
                behaviorModules: ["Light"],
                dataLocation: "./assets/sky/aboveClouds.jpg",
                fileName: "/aboveClouds.jpg",
                dataType: "jpg",
            }
        },

        {
            card: {
                name:"spray",
                type: "object",
                layers: ["pointer"],
                translation: [0, -1, -15],
                behaviorModules: ["Spray"],
                rapierSize: [0.2, 0.2, 0.2],
                rapierShape: "cuboid",
                rapierType: "positionBased",
                color: 0xcccccc,
                shadow: true,
            }
        },
        {
            card:{
                name:"earth",
                type: "object",
                translation: [-2.5, -0.5, -15],
                scale: [0.25, 0.25, 0.25],
                layers: ["pointer"],
                behaviorModules: ["Earth", "Physics", "Cascade", "Spin"],
                spin:0.02,
                rapierShape: "ball",
                //rapierForce: {x:0.2, y: 0.2, z:0.2},
                rapierSize: 2,
                rapierType: "positionBased",
                density: 2,
                shadow: true,
            }
        },
    ];
}
