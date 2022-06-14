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
        "lights.js", "crane.js", "garage.js", "forklift.js"
    ];

    Constants.UseRapier = true;

    Constants.DefaultCards = [
        {
            card: {
                name:"world model",
                layers: ["walk"],
                translation: [-0, -5.234552517024578, -0],
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
                name: "crane",
                dataTranslation: [0, -1.6, 0],
                translation: [-1.4447057496318962, -5.504611090090481, 30.282952880859376],
                dataScale: [1.2, 1.2, 1.2],
                behaviorModules: ["Crane"],
                layers: ["pointer"],
                dataLocation: "3GW5JdktuEqs-2UBA9NJWViT2JB_Bc3k7JaMSlNHLAiQLzMzNzR9aGghLisiNGkyNGkkNSg2MiIzaS4oaDJoACMRJT4rDjQGLBYkBR8jdAA_JjE-MBIMEB4edWguKGkkNSg2MiIzaSouJDUoMSI1NCJoJHYtNRErIBQALQMUMC0SKh0sIw8ABSQDPh4jPXVzDiQeLyUUag4BFgoFCmgjJjMmaD8tECgYNCx0Eh50AnUrdD8ONzc-IjYldiAwdwMAIjcYKxcALDABMH8YAQY",
                modelType: "glb",
                shadow: true,
                singleSided: true,
                type: "3d",
            }
        },
        {
            card: {
                name: "crane button 1",
                type: "object",
                translation: [7.740442246960653, 1.7740892281749288, 13.950883253194933],
                craneSpeed: -0.01,
                behaviorModules: ["CraneButton"],
                myScope: "A",
            }
        },
        {
            card: {
                name: "crane button 2",
                type: "object",
                translation: [7.740442246960653, 1.7740892281749288, 13.450883253194933],
                craneSpeed: 0.01,
                behaviorModules: ["CraneButton"],
                myScope: "A",
            }
        },
        {
            card: {
                name: "garage 1",
                type: "object",
                translation:  [-9.767605849866365, 2.1239570899863605, 10.6340848061585],
                rotation: [0, Math.PI / 2, 0],
                behaviorModules: ["Garage"],
            }
        },
        {
            card: {
                name: "forklift 1",
                dataTranslation: [0, -1.6, 0],
                translation: [37.64344906612852, 0, -20.223492416172753],
                dataScale: [1.2, 1.2, 1.2],
                behaviorModules: ["ForkLift"],
                layers: ["pointer"],
                dataLocation: "3UkowQroW_SGvJ0N4hXnZO_pwIEEVlVQNTvj8CJ0CG78PSEhJSZvenozPDkwJnsgJns2JzokIDAhezw6eiB6EjEDNyw5HCYUPgQ2Fw0xZhItNCMsIgAeAgwMZ3o8Ons2JzokIDAhezg8Nic6IzAnJjB6YBAAGSIZES8PHCcNBAVhIhlkbScSITQYHhliDR8SNy0DFz8gFAo7PAcTPnoxNCE0enhkF3gzEjxsDQYaIhwTYDsfGjkHMz84OCMTCjcjPzIfF3gkNzYgEyUtGzI",
                modelType: "glb",
                shadow: true,
                singleSided: true,
                type: "3d",
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
