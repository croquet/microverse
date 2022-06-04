// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = [
        "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
    ];

    Constants.SystemBehaviorDirectory = "behaviors/croquet";
    Constants.SystemBehaviorModules = [
        "menu.js", "elected.js", "propertySheet.js", "stickyNote.js", "avatarEvents.js"
    ];

    Constants.UserBehaviorDirectory = "behaviors/default";
    Constants.UserBehaviorModules = [
        "lights.js", "spin.js"
    ];

    const frameColor = 0xFF0000;

    Constants.DefaultCards = [
        {
            card: {
                name:"world model",
                dataScale:[1,1,1],
                translation:[22,-1.7,-20],
                rotation: [0, Math.PI, 0],
                layers: ["walk"],
                type: "3d",
                // dataLocation: "./assets/3D/oilrefinery_042122.glb.zip",
                singleSided: true,
                shadow: true,

                placeholder: true,
                placeholderSize: [100, 0.1, 100],
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
                dataLocation: "./assets/sky/syferfontein_1d_clear_1k.exr",
                dataType: "exr",
            }
        },
        {
            card: {
                name: "portal-to-one",
                className: "PortalActor",
                translation: [5, 0, -5],
                rotation: [0, Math.PI / 2, 0],
                type: "2d",
                layers: ["pointer", "portal"],
                color: 0xFF66CC,
                frameColor: frameColor,
                width: 4,
                height: 4,
                depth: 0.2,
                cornerRadius: 0.05,
                shadow: true,
                portalURL: "?world=portal1",
                sparkle: false,
            }
        },
        {
            card: {
                translation: [0, -1.7, -5],
                rotation: [0, 0, 0],
                layers: ["pointer"],
                name: "bunny",
                dataLocation: "3gEXauiO9PWsrE8v7T5rxpkbyvkR-69K1L7xKuHVbmsIDxMTFxRdSEgBDgsCFEkSFEkEFQgWEgITSQ4ISBJIIAMxBR4LLhQmDDYEJT8DVCAfBhEeEDIsMD4-VUgOCEkEFQgWEgITSQoOBBUIEQIVFAJIK1UBAVAMKgQRCwAWDgZWNQxUPVFXACUSI1MAVy0QCBdWFTQIVhYyNBBXDEgDBhMGSDQ2XgsiNhIIIRcpESpSAwMQMCUQVAMREwE9BiYRMCkQV14PCRJTAVVWKCo",
                dataScale: [0.02, 0.02, 0.02],
                fileName: "/bunny-breakdance.zip",
                modelType: "zip",
                license: "CC-BY",
                attribution: "'Bunny Breakdance' (https://skfb.ly/ouFFL) by pixelshoppe is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/)",
                shadow: true,
                singleSided: true,
                type: "3d",
            }
        }
    ];
}
