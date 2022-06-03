// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = [
        "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
    ];

    Constants.SystemBehaviorDirectory = "behaviors/croquet";
    Constants.SystemBehaviorModules = [
        "menu.js", "elected.js", "propertySheet.js", "stickyNote.js", "avatarEvents.js", "singleUser.js"
    ];

    Constants.UserBehaviorDirectory = "behaviors/campus";
    Constants.UserBehaviorModules = [
        "lights.js", "livemap.js", "drive.js", "earth.js", "spin.js"
    ];

    const frameColor = 0x888888;

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
                dataLocation: "./assets/sky/abandoned_parking_4k.jpg",
                dataType: "jpg",
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
                translation: [149.7867578489887, 1.3960140419134306, -91.04373902664706],
                rotation: [0, -0.8748879560491569, 0, 0.4843253703453173],
                layers: ["pointer"],
                type: "code",
                behaviorModule: "Drive.DriveActor",
                textScale: 0.001,
                margins: {left: 32, top: 32, right: 32, bottom: 32},
                width: 1.5,
                height: 3.0,
                depth: 0.05,
                frameColor: frameColor,
            },
        },
        {
            card: {
                name: "spin code editor",
                translation: [149.00057781750235, 0.7483579880919803, -89.65840960085829],
                rotation: [0, -0.8748879560491569, 0, 0.4843253703453173],
                layers: ["pointer"],
                type: "code",
                behaviorModule: "Spin.SpinActor",
                textScale: 0.001,
                margins: {left: 32, top: 32, right: 32, bottom: 32},
                width: 1.5,
                height: 1.7,
                depth: 0.05,
                frameColor: frameColor,
            },
        },
        {
            card: {
                name:"porsche",
                dataRotation: [-Math.PI / 2, -Math.PI / 2, 0],
                translation: [143.31275751948277,  -0.5025376743590352, -92.18863795132113],
                dataScale: [0.0002660954536233986, 0.0002660954536233986, 0.0002660954536233986],
                layers: ["pointer"],
                type: "3d",
                multiuser: true,
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
                behaviorModules: ["Earth", "SingleUser", "SingleUserSpin"],
                layers: ["pointer"],
                multiuser: true,
                color: 0xaaaaaa,
            }
        },
    ];
}
