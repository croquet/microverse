// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = [
        "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
    ];

    Constants.UserBehaviorDirectory = "behaviors/campus";
    Constants.UserBehaviorModules = [
        "lights.js", "livemap.js", "drive.js", "earth.js", "spin.js", "pendulum.js", "openPortal.js", "cascade.js"
    ];

    const frameColor = 0x888888;

    // let cr = [0.47123889803846897, -0.7456756856460655, 0];
    // let cr2 = [0.35123889803846897, -0.7456756856460655, 0];

    // let baseSize = [5, 0.3, 5];

    Constants.DefaultCards = [
        {
            card: {
                name:"world model",
                dataScale: [9, 9, 9],
                dataTranslation: [108, -17.5, -128],
                dataRotation: [0, Math.PI / 12 * 5, 0],
                // dataTranslation: [22, -10.7, -20],
                layers: ["walk"],
                type: "3d",
                dataLocation: "3Ep4wIDFLOzFTJAw0JPxevGXaAv1FM_VZ1jSCqYN7R4ELTExNTZ_amojLCkgNmswNmsmNyo0MCAxaywqajBqAiETJzwpDDYELhQmBx0hdgI9JDM8MhAOEhwcd2osKmsmNyo0MCAxaygsJjcqMyA3NiBqEXAGci8jHHMhFg8JLgwVADwwMTU1CjcsCj8Rd3c9M3J8DCcXN3x3LTFwHGohJDEkaicHfCd3KXYsDAMyCxQENgILHHwLPQo2DHIgKzYCdHANBjQEInEBLQFycnE",
                modelType: "glb",
                singleSided: true,
                shadow: true,

                placeholder: false,
                placeholderSize: [100, 0.01, 100],
                placeholderColor: 0xcccccc,
                placeholderOffset: [0, -1.7, 0],

            }
        },
        {
            card: {
                name: "light",
                layers: ["light"],
                type: "lighting",
                behaviorModules: ["Light"],
                dataLocation: "3OF2-s4U1ZOJduGATmLEIXo1iTkQHd5ZBknKgL5SvqpQJzs7Pzx1YGApJiMqPGE6PGEsPSA-Oio7YSYgYDpgCCsZLTYjBjwOJB4sDRcrfAg3Ljk2OBoEGBYWfWAmIGEsPSA-Oio7YSImLD0gOSo9PCpgPwB9AAIIISx8YiYneScqKyQaIisNLHkaGT8YKg56JQwQfHstPiNiGQ49e2ArLjsuYCMBPgMiCQt3OQskGhcleSp9HQIIfXseHgo7EAo9CB48FRwpegsCLH4OIwY",
                dataType: "jpg",
                fileName: "/abandoned_parking_4k.jpg"
            }
        },
        {
            card: {
                name: "live map",
                layers: ["pointer"],
                translation: [8.999125084167558, 0, -19.387417027859254],
                type: "object",
                behaviorModules: ["CampusMap"],
            }
        },

        {
            card: {
                name: "drive code editor",
                translation: [149.7867578489887, 1.05, -91.04373902664706],
                rotation: [0, -0.8748879560491569, 0, 0.4843253703453173],
                layers: ["pointer"],
                type: "code",
                behaviorModule: "Drive.DriveActor",
                textScale: 0.001,
                margins: {left: 32, top: 32, right: 32, bottom: 32},
                width: 1.5,
                height: 2.3,
                depth: 0.05,
                backgroundColor: 0xdddddd,
                frameColor: frameColor,
                fullBright: true,
            },
        },
        {
            card: {
                name: "spin code editor",
                translation: [149.00057781750235, 0.90, -89.65840960085829],
                rotation: [0, -0.8748879560491569, 0, 0.4843253703453173],
                layers: ["pointer"],
                type: "code",
                behaviorModule: "Spin.SpinActor",
                textScale: 0.001,
                margins: {left: 32, top: 32, right: 32, bottom: 32},
                width: 1.5,
                height: 2.0,
                depth: 0.05,
                backgroundColor: 0xdddddd,
                frameColor: frameColor,
                fullBright: true,
            },
        },
        {
            card: {
                name:"porsche",
                dataRotation: [-Math.PI / 2, Math.PI / 2, 0],
                translation: [148,  -0.5025376743590352, -85],
                dataScale: [0.0002660954536233986, 0.0002660954536233986, 0.0002660954536233986],
                layers: ["pointer"],
                type: "3d",
                dataLocation: "3Rph2fVNkc0jhp42pQF7jVIX5t2yeugm3T6CFPV1F4c4OiYmIiFofX00Oz43IXwnIXwxID0jJzcmfDs9fSd9BB4aNghrYWMwFDEIFidjEzsGZSYcOxAmajgYYH07PXwxID0jJzcmfD87MSA9JDcgITd9EyUlJhYaBj8oOzFnOTocMCEwNjZ_OgZiATQGOgE_OD0BZgU9ZR4iAjoIOX02MyYzfTwzaio-MyE7NA07NT8KFQVrNWATYAA7GRllYWMFEBhiJQskIj8xfyM9ZmI",
                behaviorModules: ["Drive"]
            }
        },
        {
            card: {
                name:"earth",
                translation: [147.70323689149595, 0.8838222646660217, -86.95265588900374],
                //translation: [0, 0.8838222646660217, -5],
                scale: [0.3, 0.3, 0.3],
                type: "object",
                behaviorModules: ["Earth", "SingleUser", "Spin"],
                layers: ["pointer"],
                color: 0xaaaaaa,
            }
        },
        {
            card: {
                name:"pendulum",
                type: "object",
                translation: [71.17293618667556, 8.245323976153406, -106.57786383978849],
                // translation: [68, 9.3, -102],
                behaviorModules: ["Pendulum"],
                layers: ["pointer"],
                scale: [0.2, 0.2, 0.2],
                color: 0xaa6666,
            }
        },
        {
            card: {
                name: "portal button",
                translation: [105.67628941950562, 5.0461322473076, -140.72201642878923],
                behaviorModules: ["OpenRefineryPortalButton"],
                type: "object",
            }
        },
        {
            card: {
                name: "cascade",
                translation: [117.51152685835386, 5.399264662960818, -133.3030737470486],
                rotation: [0, -Math.PI * 0.24, 0],
                // translation: [3, 3, -10],
                behaviorModules: ["CascadeBox"],
                type: "object"
            }
        }
    ];
}
