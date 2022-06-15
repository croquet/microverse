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
        "lights.js", "crane.js", "garage.js", "forklift.js", "circle.js", "cascade.js", "earth.js"
    ];

    Constants.UseRapier = true;

    Constants.DefaultCards = [
        {
            card: {
                name:"world model",
                layers: ["walk"],
                translation: [-0, -5.234552517024578, -0],
                dataLocation: "34mlYnF8Yz2LiAu7ut9XWzOHWMrxM8wPmqOJlkqrOt2sXEBAREcOGxtSXVhRRxpBRxpXRltFQVFAGl1bG0Ebc1BiVk1YfUd1X2VXdmxQB3NMVUJNQ2F_Y21tBhtdWxpXRltFQVFAGlldV0ZbQlFGR1EbUgRcQXJkXV1tVldNU0dzWGZwZlddeldOGUYHZ3h9f21hUHVdZAFEfAVaDBtQVUBVG3FEZn9rWl9XdkYCf1lBXnNfGXtccgdcdloFcGxmXwx9XmxHeFBwVnx1QUM",
                dataScale: [1.2, 1.2, 1.2],
                fileName: "/Factory.glb",
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
                translation: [3.816793504629362, 4.136223779145266, 30.394897079467775], // [7.770442246960653, 1.7540892281749288, 13.950883253194933],
                craneSpeed: -0.01,
                behaviorModules: ["CraneButton"],
                myScope: "A",
            }
        },
        {
            card: {
                name: "crane button 2",
                type: "object",
                translation: [3.816793504629362, 4.636223779145266, 30.394897079467775],
                craneSpeed: 0.01,
                behaviorModules: ["CraneButton"],
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
                runs: [{text: "Crane Controls:\nTop Button Moves Crane Forward\nBottom Button Moves Crane Backward"}],
                margins: {left: 30, top: 30, right: 30, bottom: 30},
                backgroundColor: 0x707070,
                color: 0xffffff,
                frameColor: 0x222222,
                width: 3.4,
                height: 1,
                textScale: 0.004,
                shadow: true,
                fullbright: true,
            }
        },
        {
            card: {
                name: "garage 1",
                type: "3d",
                translation: [7.799494248347024, -0.3110201562611392, 10.508325734249267],
                dataScale: [1.2, 1.2, 1.2],
                rotation: [0, Math.PI / 2, 0],
                dataLocation: "3YN8uWqjAyPsTcUXkWmcJtbn_ypFvp_WKzKCiZx-5-PwMS0tKSpjdnY_MDU8KncsKnc6KzYoLDwtdzA2dix2Hj0POyA1ECoYMgg6GwE9ah4hOC8gLgwSDgAAa3YwNnc6KzYoLDwtdzQwOis2LzwrKjx2DRpqGzw8aSEqbR5vahw3Nw8wFzIbAW0DbzsrMQoBYSkgHj8XFSlsIQ1pGHY9OC04dg5pNmoxAAA6MA4edD0WFztpEwMrPC0wMysKOh8eaW4DKyELFxE9Fm4GPzI",
                modelType: "glb",
                layers: ["pointer", "walk"],
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
                name: "forklift 2",
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
                name: "drone 1",
                layers: ["pointer"],
                translation: [28.30055025496248, 4.7, 18.673839690273365],
                dataLocation: "3c6tYer0EslC-sOFH5y-cF29-6EwCU1p5meYK1no8ymICxcXExBZTEwFCg8GEE0WEE0AEQwSFgYXTQoMTBZMJAc1ARoPKhAiCDIAITsHUCQbAhUaFDYoNDo6UUwKDE0AEQwSFgYXTQ4KABEMFQYREAZMNSZQMlEXLSlXGTUlVRA6OhICDCoCDVopOhA8JztbBARTARQtUwQlDFRWW0wHAhcCTAE0KSpaNzckLCZOEAg5FwURAVokAhpTNVUVLTEKJjIBVQwROjIrWhJWKzI",
                dataScale: [1.2, 1.2, 1.2],
                behaviorModules: ["Circle"],
                modelType: "glb",
                shadow: true,
                singleSided: true,
                type: "3d",
            }

        },
        {
            card: {
                name:"code editor",
                translation: [28.30055025496248, 1.9416405302346669, 13.673839690273365],
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
                frameColor: 0x888888,
            }
        },
        {
            card: {
                name:"base",
                type: "object",
                layers: ["pointer"],
                translation: [13.096899862946268, 1.971934214047139, 17.421859492871423],
                rotation: [0.47123889803846897, Math.PI / 2, 0],
                behaviorModules: ["Rapier", "Cascade"],
                rapierSize: [5, 0.3, 5],
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
                layers: ["pointer"],
                translation:  [16.762074207944522, 0.10577659184032862, 17.421859492871423],
                rotation: [0.35123889803846897, Math.PI / 2, 0],
                behaviorModules: ["Rapier", "Cascade"],
                rapierSize: [5, 0.3, 2],
                color: 0x997777,
                rapierShape: "cuboid",
                rapierType: "positionBased",
                shadow: true,
            }
        },

        {
            card: {
                name:"spray",
                type: "object",
                layers: ["pointer"],
                translation: [11.342398091737556, 4.306399511061578, 17.421859492871423],
                behaviorModules: ["Spray"],
                rapierSize: [0.2, 0.2, 0.2],
                rapierShape: "cuboid",
                rapierType: "positionBased",
                color: 0xcccccc,
                shadow: true,
            }
        },
        {
            card: {
                translation: [51.91000213623047, 5.175040227971613, -28.295106048051267],
                scale: [3.3, 3.3, 3.3],
                rotation: [0, -Math.PI / 2, 0],
                layers: ["pointer"],
                behaviorModules: ["PDFView"],
                color: 8947848,
                depth: 0.05,
                frameColor: 16777215,
                fullBright: true,
                modelType: "pdf",
                pdfLocation: "3i2bjIBqONmUqz8XGj0oguUVu-wJleyHEiMp8RBLCX2sAR0dGRpTRkYPAAUMGkccGkcKGwYYHAwdRwAGRhxGLg0_CxAFIBooAjgKKzENWi4RCB8QHjwiPjAwW0YABkcKGwYYHAwdRwQAChsGHwwbGgxGWjFcGQxRBQY8IA4-UBkaLwMTHBsEIA1cEVsCGTY2LCgKIBlROw8tNg8-XUYNCB0IRhAeHRoqCw8EBjguAxMiBQQxBDw7Xl8AKiddMVkdIB02Nh4zIRskGyomXgI",
                shadow: true,
                singleSided: true,
                type: "2d",
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
