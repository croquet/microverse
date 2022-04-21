// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.MaxAvatars = 6;
    Constants.AvatarNames = [
        "generic/1", "generic/2", "generic/3", "generic/4", "generic/5", "generic/6",
        "alice", "newwhite", "fixmadhatter", "marchhare", "queenofhearts", "cheshirecat"
    ];

    Constants.SystemBehaviorDirectory = "behaviors/croquet";
    Constants.SystemBehaviorModules = [
        "menu.js", "elected.js", "propertySheet.js"
    ];

    Constants.UserBehaviorDirectory = "behaviors/default";
    Constants.UserBehaviorModules = [
        "lights.js", "pendulum.js"
    ];

    // const frameColor = 0x888888;

    Constants.DefaultCards = [
        {
            card: {
                name:"world model",
                translation:[0, -10, -60],
                scale:[200, 200, 200],
                rotation: [0, Math.PI, 0],
                layers: ["walk"],
                type: "3d",
                // dataLocation: "./assets/3D/Oil Refinery 6.glb.zip",
                singleSided: true,
                shadow: true,
                placeholder: true,
                placeholderSize: [40, 1, 40],
                placeholderColor: 0x808080,
                placeholderOffset: [0, -0.463, 0],

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
                translation: [0, 0, -20],
                rotation: [0, 0, 0],
                dataScale: [60, 60, 60],
                behaviorModules: ["Pendulum"],
                name: "/pendulum.glb",
                dataLocation: "3JgZ_1T1AB94iniahMT85sbJVNF8v_o48pjKzfbTLIdEIj4-OjlwZWUsIyYvOWQ_OWQpOCU7Py8-ZCMlZT9lDS4cKDMmAzkLIRspCBIueQ0yKzwzPR8BHRMTeGUjJWQpOCU7Py8-ZC4rPCMuZCs9LzklJy9nKzo6ZXxyDx4jLAAVLRMrfjl-CBMYJRwOLxl4Bx8zJBsCGRN_ISA4OCw7ch8lfRNlLis-K2UHFSkNfB4HAn8NJT4tc3w4JBMBGSA7Ih0MHRsNGgszDRl4ITgQB3spDDkb",
                fileName: "/pendulum.glb",
                modelType: "glb",
                shadow: true,
                singleSided: true,
                type: "3d",
            }
        }
    ];
}
