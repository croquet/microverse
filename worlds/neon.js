// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = ["newwhite"];

    Constants.UserBehaviorDirectory = "behaviors/neon";
    Constants.UserBehaviorModules = [
        "lights.js",
        "bloompass.js",
    ];

    Constants.DefaultCards = [
        {
            card: {
                name: "entrance",
                type: "object",
                translation: [-10, 0, 0],
                rotation: [0, -Math.PI / 2, 0],
                spawn: "default",
            }
        },
        {
            card: {
                name: "light",
                layers: ["light"],
                type: "lighting",
                behaviorModules: ["Light"],
            }
        },
        {
            card: {
                name:"world model",
                layers: ["walk"],
                type: "3d",
                behaviorModules: ["BloomPass"],
                singleSided: true,
                shadow: false,
                translation:[0, -1.7, 0],

                fileName: "scifi.glb",
                modelType: "glb",
                dataLocation: "3y8lwrMGNTMf6mP6dqIpwSSkXJWxlb-adEMdxlxaabswEQ0NCQpDVlYfEBUcClcMClcaCxYIDBwNVxAWVgxWAywNDik2Az8MNipIMhAeNCMQTEpAAT89PkFJS1YQFlcaCxYIDBwNVxQQGgsWDxwLChxXFRYaGBUdHA8dHB8YDBUNViEYT1QWTyBMASlPEzpLGEw6FwtAERgJPRU1Hx8dOhVMDjgWPi8IQDoKFCxWHRgNGFY1SCwAFDwYFC80JggqEj4pARsxP0gdHzoODUhOG0tBMQ01TCAUADAmLDoS",
                license: "CC-BY-4.0",
                attribution: "'Sci-fi neon model' (https://skfb.ly/6YvXI) by ni_and_ka is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).",

                placeholder: true,
                placeholderSize: [400, 0.1, 400],
                placeholderColor: 0x000000,
                placeholderOffset: [0, 0, 0],
            }
        },
    ];
}
