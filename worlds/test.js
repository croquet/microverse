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

    Constants.UserBehaviorDirectory = "behaviors/default";
    Constants.UserBehaviorModules = [
        "csmLights.js"
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
                placeholderColor: 0xc0c0c0,
                placeholderOffset: [0, 0, 0],
            }
        },
        {
            card: {
                name: "light",
                layers: ["light"],
                type: "lighting",
                behaviorModules: ["Light"],
                dataLocation: "3OF2-s4U1ZOJduGATmLEIXo1iTkQHd5ZBknKgL5SvqpQJzs7Pzx1YGApJiMqPGE6PGEsPSA-Oio7YSYgYDpgCCsZLTYjBjwOJB4sDRcrfAg3Ljk2OBoEGBYWfWAmIGEsPSA-Oio7YSImLD0gOSo9PCpgPwB9AAIIISx8YiYneScqKyQaIisNLHkaGT8YKg56JQwQfHstPiNiGQ49e2ArLjsuYCMBPgMiCQt3OQskGhcleSp9HQIIfXseHgo7EAo9CB48FRwpegsCLH4OIwY",
                fileName: "/abandoned_parking_4k.jpg",
                dataType: "jpg",
                toneMappingExposure: 1.2
            }
        },
        {
            card: {
                translation: [0, 2, -4],
                scale: [4, 4, 4],
                layers: ["pointer"],
                behaviorModules: ["PDFView"],
                color: 8947848,
                depth: 0.05,
                frameColor: 16777215,
                fullBright: true,
                modelType: "pdf",
                fileName: "/Croquet Microverse Product Deck - Oct 25b 2022 - Distro.pdf",
                pdfLocation: "3HgyNLeuXEk5ULkVat-Q3pm19KHPQU3YmpYZBQTiumFQIDw8ODtyZ2cuISQtO2Y9O2YrOic5PS08ZiEnZz1nDyweKjEkATsJIxkrChAsew8wKT4xPx0DHxERemchJ2YrOic5PS08Zi8pJCQtOjFnIQIHOAYnB314ADp8CQwbJw8nCx8AGHplDQQBLycOB3w4CgV5OQ0ALR0XHWcsKTwpZwAMMB4FO39_fXxlO38bcBh8eQ0BDnB8eS0CIxsMcR8rEQsiPAs_Fx4iHyc",
                shadow: true,
                singleSided: true,
                type: "2d",
            }
        },
    ];
}
