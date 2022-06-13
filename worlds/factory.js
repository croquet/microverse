// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = [
        "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
    ];

    Constants.SystemBehaviorDirectory = "behaviors/croquet";
    Constants.SystemBehaviorModules = [
        "menu.js", "elected.js", "propertySheet.js", "stickyNote.js", "rapier.js", "avatarEvents.js", "pdfview.js", "singleUser.js"
    ];

    Constants.UserBehaviorDirectory = "behaviors/factory";
    Constants.UserBehaviorModules = [
        "lights.js"
    ];

    Constants.UseRapier = true;

    Constants.DefaultCards = [
        {
            card: {
                name:"world model",
                layers: ["walk"],
                translation: [-0, -5.234552517024578, -0],
                name: "/Factory.glb",
                dataLocation: "3WHcQZWbH34-Qfg-_FPELSN49AAo5jF_eLzeTwKhTARgPyMjJyRteHgxPjsyJHkiJHk0JTgmIjIjeT44eCJ4EDMBNS47HiQWPAY0FQ8zZBAvNiEuIAIcAA4OZXg-OHk0JTgmIjIjeTo-NCU4ITIlJDJ4PQQDFj46FjgzZDUbZDwDDy0vGAACOw0_Jw8Ob2YcBQVkJBwiZDoiEQAdGngzNiM2eBs0OSE0IyV6GSQGYmE-PTNmIgQxMjQQJx0_O2FhLS0aIzYBJQAtBW8DegI",
                dataScale: [1.2, 1.2, 1.2],
                fileName: "/Factory.glb",
                modelType: "glb",
                shadow: true,
                singleSided: true,
                type: "3d",
                placeholder: true,
                placeholderSize: [400, 0.1, 400],
                placeholderColor: 0x808080,
                placeholderOffset: [0, 0, 0],
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
                name: "start point",
                type: "object",
                translation: [0, 4.4, 34],
                spawn: "default"
            }
        }
    ];
}
