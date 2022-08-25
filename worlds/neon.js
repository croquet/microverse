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
                translation: [0, 0, 12],
                rotation: [0, 0, 0],
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
                translation: [0, -1.7, 0],

                fileName: "scifi.glb",
                modelType: "glb",
                dataLocation: "3w2MWUEGDG7BdjeMe6E0SBr0f7P5vuX4OJz1K8aL8V8wHwMDBwRNWFgRHhsSBFkCBFkUBRgGAhIDWR4YWAJYMBMhFQ4bPgQ2HCYUNS8TRDAPFgEOACI8IC4uRVgeGFkUBRgGAhIDWRoeFAUYARIFBBJYEQImIUUoRDonRTFHAB4bGTUBD0cxPUdDIDQfTxg2LxQRPgYyMiU9RRkZNlgTFgMWWAZPGTw0LkZCOQ0tESQhMUYHMB8UWiJOOzggMDZDFRxOIk8_Tz1CKDIBERw",
                dataScale: [2, 2, 2],
                placeholder: true,
                placeholderSize: [400, 0.1, 400],
                placeholderColor: 0x000000,
                placeholderOffset: [0, 0, 0],
            }
        },
    ];
}
