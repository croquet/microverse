// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = [
        "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
    ];

    Constants.UserBehaviorDirectory = "behaviors/default";
    Constants.UserBehaviorModules = [
        "demo.js", "flightTracker.js", "spin.js", "lights.js",
        "slides.js", "cascade.js"
    ];

    Constants.UseRapier = true;

    const frameColor = 0x888888;
    const cardHeight = 0.5;

    const baseY = 6;
    const bt = [-20, baseY, 64]; // bt for base translation

    const baseSize = [20, 1, 20];

    Constants.DefaultCards = [
        {
            card: {
                name:"world model",
                dataScale:[1,1,1],
                translation:[22,-1.7,-20],
                rotation: [0, Math.PI, 0],
                layers: ["walk"],
                type: "3d",
                dataLocation: "3rx2j5qhM3G8o4AN9CCW-cil8u0xaKSLWH8OOz2ZtO28GgYGAgFIXV0UGx4XAVwHAVwRAB0DBxcGXBsdXQddNRYkEAseOwEzGSMRMCoWQTUKEwQLBSc5JSsrQF0bHVwRAB0DBxcGXB8bEQAdBBcAARddQD8aOzYoJRcYGxEVJkMDRRY9CEQ2BxkgKhs_MENfGxg5MTZAPCsWHzkQO10WEwYTXSsxEzYwIQABBABGHx4xMyQWNgMkFCU0NScFJB8mAB9ALRYTHDMYHCIEIgE",
                fileName: "/oilrefinery_042122.glb.zip",
                singleSided: true,
                shadow: true,

                placeholder: true,
                placeholderSize: [100, 0.01, 100],
                placeholderColor: 0xcccccc,
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
                fileName: "./abandoned_parking_4k.jpg",
                dataType: "jpg",
            }
        },
        {
            card: {
                name:"simple 3D model",
                translation: [-4, cardHeight, -18],
                type: "3d",
                fileName: "./Gears.glb.zip",
                dataLocation: "38ertF-f8M4ASQWFF4fagk-_SHL8meMigLoBFFgpWLXIUExMSEsCFxdeUVRdSxZNSxZbSldJTV1MFlFXF00Xf1xuWkFUcUt5U2lbemBcC39AWU5BT21zb2FhChdRVxZbSldJTV1MFlVRW0pXTl1KS10XCnVQcXxib11SUVtfbAlJD1x3Qg58TVNqYFF1egkVUVJze3wKdmFcVXNacRdcWUxZF05vfFNWYGhxUktaUGFMfgFdfn5BTkt0Z1wLc2EOC04LckJXV1lZWQBQe2E",
                dataScale: [0.566177949493676, 0.566177949493676, 0.566177949493676],
                modelType: "glb",
                dataRotation: [Math.PI / 2, Math.PI / 2, 0],
                shadow: true,
                singleSided: true,
            }
        },
        {
            card: {
                name: "image card",
                translation: [-4, cardHeight, -23],
                rotation: [0, Math.PI / 2, 0],
                scale: [4, 4, 4],
                type: "2d",
                textureType: "image",
                textureLocation: "3fvgFmVBKXfTxHFwOzsh55GqCmp7CcpWW96D8eDxdIJwDhISFhVcSUkADwoDFUgTFUgFFAkXEwMSSA8JSRNJIQIwBB8KLxUnDTcFJD4CVSEeBxAfETMtMT8_VEkPCUgFFAkXEwMSSAsPBRQJEAMUFQNJVgsLUDA1Fx9XPy4KIBQ_UAI3LCkBXggOLgkREzAJLSdTKTcECgMXPjM2EUkCBxIHST4TDlVfACUuFFI2A1MCNTNLKg4EJDARUV8nKCQTAxReL1c3IiUkEVcVVQU",
                fileName: "/Coloney.png",
                frameColor,
                color: 0xffffff,
                cornerRadius: 0.05,
                depth: 0.05,
                fullBright: false
            }
        },
        {
            card: {
                name: "portal",
                className: "PortalActor",
                translation: [-4, -0.4, -29],
                rotation: [0, -Math.PI / 2, 0],
                type: "2d",
                layers: ["pointer"],
                color: 0xFF66CC,
                frameColor: frameColor,
                width: 1.8,
                height: 2.4,
                depth: 0.2,
                cornerRadius: 0.05,
                shadow: true,
                portalURL: "?world=default",
                sparkle: false,
            }
        },
        {
            card: {
                name:"flightTracker",
                translation: [-4, 2, -50],
                type: "object",
                scale:[0.75,0.75,0.75],
                behaviorModules: ["Elected", "FlightTracker", "Spin"],
                layers: ["pointer"],
                color: 0xaaaaaa,
            }
        },
        {
            card: {
                name:"code editor",
                translation: [8, -0.5, -8],
                rotation: [0, -Math.PI / 2, 0],
                layers: ["pointer"],
                type: "code",
                behaviorModule: "Circle.CircleActor",
                margins: {left: 32, top: 32, right: 32, bottom: 32},
                // margins: {left: 16, top: 16, right: 16, bottom: 16},
                textScale: 0.001,
                width: 1.5,
                height: 2,
                depth: 0.05,
                fullBright: true,
                frameColor: frameColor,
            }
        },
        {
            card: {
                name:"flamingo model",
                dataTranslation: [0, 3, 0],
                translation: [0, 0, -8],
                type: "3d",
                fileName: "/Flamingo.glb.zip",
                dataLocation: "32EmG-BV6plHy8gXm9UVfS8S7ViQHha17NI3dr8C15V4WkZGQkEIHR1UW15XQRxHQRxRQF1DR1dGHFtdHUcddVZkUEtee0FzWWNRcGpWAXVKU0RLRWd5ZWtrAB1bXRxRQF1DR1dGHF9bUUBdRFdAQVcdAH9ae3ZoZVdYW1FVZgNDBVZ9SAR2R1lgalt_cAMfW1h5cXYAfGtWX3lQex1WU0ZTHVloR1ZEVVpDVQUEYFdoVFl0RApqX398WAVqaGF9U3dGX1t6Zn5ralZjbXs",
                dataScale: [0.009613073749495703, 0.009613073749495703, 0.009613073749495703],
                modelType: "glb",
                behaviorModules: ["Circle"]
            }
        },
        {
            card: {
                name:"base",
                type: "object",
                layers: ["pointer", "walk"],
                rotation: [-Math.PI / 6, 0, 0],
                translation: bt,
                behaviorModules: ["Rapier", "Cascade"],
                rapierSize: baseSize,
                color: 0x997777,
                rapierShape: "cuboid",
                rapierType: "positionBased",
                shadow: true,
            }
        },
        {
            card: {
                name:"base 2",
                type: "object",
                layers: ["pointer", "walk"],
                translation: [bt[0], -0.30484568847637494, bt[2] - 11.772],
                rotation: [-Math.PI / 8, 0, 0],
                behaviorModules: ["Rapier", "Cascade"],
                rapierSize: [baseSize[0], baseSize[1], baseSize[2] / 3],
                color: 0x997777,
                rapierShape: "cuboid",
                rapierType: "positionBased",
                shadow: true,
            }
        },
        {
            card: {
                name:"base 3",
                type: "object",
                layers: ["pointer", "walk"],
                translation: [bt[0], -2.11649335743053, bt[2] - 21.18],
                rotation: [0, 0, 0],
                behaviorModules: ["Rapier", "Cascade"],
                rapierSize: [baseSize[0] * 0.5, baseSize[1], baseSize[2] * 0.3],
                color: 0x997777,
                rapierShape: "cuboid",
                rapierType: "positionBased",
                shadow: true,
            }
        },
        {
            card: {
                name:"init box",
                type: "object",
                layers: ["pointer"],
                translation: [bt[0], -1.11649335743053, bt[2] - 20.80],
                rotation: [0, 0, 0],
                behaviorModules: ["Rapier", "Cascade"],
                rapierSize: [1, 1, 1],
                rapierShape: "cuboid",
                color: 0xa2d490,
                shadow: true,
            }
        },
        {
            card: {
                name:"spray",
                type: "object",
                layers: ["pointer"],
                translation: [bt[0], 20, bt[2] + 2],
                behaviorModules: ["Spray", "Rapier", "Cascade"],
                rapierSize: [1, 1, 1],
                rapierShape: "cuboid",
                rapierType: "positionBased",
                color: 0xcccccc,
                shadow: true,
            }
        },
    ];
}
