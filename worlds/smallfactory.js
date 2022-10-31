// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = [
        "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
    ];

    Constants.UserBehaviorDirectory = "behaviors/factory";
    Constants.UserBehaviorModules = [
        "smalllights.js", "craneQR.js", "garage.js", "forklift.js", "circle.js", "spin.js" // Include craneQR For QR Crane
    ];

    Constants.DefaultCards = [
        {
            card: {
                name: "world model",
                layers: ["walk"],
                translation: [-0, -5.234552517024578, -0],
                fileName: "/smallfactory.glb",
                dataLocation: "3yCikF94D95p-qta7JPcMOO9APg1h0Xa5h6jp1c8NsSUEQ0NCQpDVlYfEBUcClcMClcaCxYIDBwNVxAWVgxWPh0vGwAVMAo4EigaOyEdSj4BGA8ADiwyLiAgS1YQFlcaCxYIDBwNVxQQGgsWDxwLChxWVDgBNBsXEwgNPD9IPD4vP0gUPiYRSihINzAeEUs0AQlLHkwNDyMeOg4mLFYdGA0YVhUtDhMIIzFLLikwKxYcNSMgKDs3TB0OSz8_QDgTVAEYGA1KMwEAShY1HSw",
                dataScale: [1.2, 1.2, 1.2],
                modelType: "glb",
                shadow: true,
                singleSided: true,
                type: "3d",
                placeholder: true,
                placeholderSize: [400, 14, 400],
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
                dataLocation: "3OF2-s4U1ZOJduGATmLEIXo1iTkQHd5ZBknKgL5SvqpQJzs7Pzx1YGApJiMqPGE6PGEsPSA-Oio7YSYgYDpgCCsZLTYjBjwOJB4sDRcrfAg3Ljk2OBoEGBYWfWAmIGEsPSA-Oio7YSImLD0gOSo9PCpgPwB9AAIIISx8YiYneScqKyQaIisNLHkaGT8YKg56JQwQfHstPiNiGQ49e2ArLjsuYCMBPgMiCQt3OQskGhcleSp9HQIIfXseHgo7EAo9CB48FRwpegsCLH4OIwY",
                fileName: "/abandoned_parking_4k.jpg",
                dataType: "jpg",
            }
        },
        {
            card: {
                name: "crane",
                type: "object",
                translation: [-1.4447057496318962, -5.504611090090481, 30.282952880859376],
                behaviorModules: ["Crane"],
                layers: ["pointer"],
                shadow: true,
                scale: [0.4, 0.4, 0.4],
            }
        },
        {
            card: {
                name: "crane button 1",
                type: "object",
                translation: [3.816793504629362, 4.336223779145266, 30.294897079467775], // [7.770442246960653, 1.7540892281749288, 13.950883253194933],
                rotation: [0, 0, Math.PI],
                craneSpeed: -0.0010,
                behaviorModules: ["CraneButton"],
                shadow: true,
                myScope: "A",
            }
        },
        {
            card: {
                name: "crane button 2",
                type: "object",
                translation: [3.816793504629362, 4.436223779145266, 30.294897079467775],
                rotation: [0, 0, 0],
                craneSpeed: 0.0010,
                behaviorModules: ["CraneButton"],
                shadow: true,
                myScope: "A",
            }
        },
        {
            card: {
                name:"crane explanation",
                className: "TextFieldActor",
                translation: [5.875421017365224, 4.38622377915, 30.394897079467775],
                rotation: [0, 0, 0],
                depth: 0.10,
                type: "text",
                runs: [{text: "Lateral Crane Controller"}],
                margins: {left: 15, top: 48, right: 10, bottom: 0},
                backgroundColor: 0x707070,
                color: 0xB0841B,
                frameColor: 0x222222,
                width: 3.4,
                height: 1,
                textScale: 0.007,
                shadow: true,
                fullbright: true,
                noDismissButton: true,
            }
        },
        {
            card: {
                name: "garage 1",
                type: "3d",
                translation: [16.016934687664644, -1.7187205841929383, -40.90],
                dataScale: [1.2, 1.2, 1.2],
                rotation: [0, Math.PI / 2, 0],
                dataLocation: "3YN8uWqjAyPsTcUXkWmcJtbn_ypFvp_WKzKCiZx-5-PwMS0tKSpjdnY_MDU8KncsKnc6KzYoLDwtdzA2dix2Hj0POyA1ECoYMgg6GwE9ah4hOC8gLgwSDgAAa3YwNnc6KzYoLDwtdzQwOis2LzwrKjx2DRpqGzw8aSEqbR5vahw3Nw8wFzIbAW0DbzsrMQoBYSkgHj8XFSlsIQ1pGHY9OC04dg5pNmoxAAA6MA4edD0WFztpEwMrPC0wMysKOh8eaW4DKyELFxE9Fm4GPzI",
                modelType: "glb",
                layers: ["pointer", "walk"],
                behaviorModules: ["Garage"],
                garageIndex: 0
            }
        },
        {
            card: {
                name: "forklift 1", // 2 In Full Version
                dataTranslation: [0, -0.2, 0],
                translation: [-6.864045029864473, 0, -6.132494653566097],
                dataScale: [1.2, 1.2, 1.2],
                behaviorModules: ["ForkLift"],
                layers: ["pointer"],
                dataLocation: "3UkowQroW_SGvJ0N4hXnZO_pwIEEVlVQNTvj8CJ0CG78PSEhJSZvenozPDkwJnsgJns2JzokIDAhezw6eiB6EjEDNyw5HCYUPgQ2Fw0xZhItNCMsIgAeAgwMZ3o8Ons2JzokIDAhezg8Nic6IzAnJjB6YBAAGSIZES8PHCcNBAVhIhlkbScSITQYHhliDR8SNy0DFz8gFAo7PAcTPnoxNCE0enhkF3gzEjxsDQYaIhwTYDsfGjkHMz84OCMTCjcjPzIfF3gkNzYgEyUtGzI",
                pathIndex: 1,
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
                translation: [0, 4.4, 38],
                spawn: "default"
            }
        }
    ];
}
