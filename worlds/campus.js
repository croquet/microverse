// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = [
        "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
    ];

    Constants.SystemBehaviorDirectory = "behaviors/croquet";
    Constants.SystemBehaviorModules = [
        "menu.js", "elected.js", "propertySheet.js", "stickyNote.js", "rapier.js", "avatar.js"
    ];

    Constants.UserBehaviorDirectory = "behaviors/default";
    Constants.UserBehaviorModules = [
        "demo.js", "bitcoinTracker.js", "flightTracker.js", "spin.js", "lights.js",
        "slides.js", "cascade.js",
    ];

    Constants.UseRapier = true;

    const frameColor = 0x888888;
    const cardHeight = 0.5;

    const baseY = 6;
    const wallHeight = 3;
    const wallThick = 0.2;
    const bt = [-20, baseY, 48]; // bt for base translation
    const baseSize = [20, 1, 20];
    const half = baseSize[0] / 2;
    const wallBase = bt[1] + wallHeight / 2 + baseSize[1] / 2;

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
    ];
}
