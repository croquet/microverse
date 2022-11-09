// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = [
        "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
    ];

    Constants.UserBehaviorDirectory = "behaviors/default";
    Constants.UserBehaviorModules = [
        "demo.js", "lights.js", "bouncingBall.js", "bitcoinTracker.js", "spin.js", "openPortal.js", "urlLink.js", "text3D.js"
    ];

    const frameColor = 0x888888;

    Constants.DefaultCards = [
        {
            card: {
                name: "entrance",
                type: "object",
                // same position and orientation as in openPortal.js
                translation: [-12, -0.4, -10.2],
                rotation: [0, -Math.PI / 2, 0],
                spawn: "default",
            }
        },
        {
            card: {
                name:"world model",
                type: "3d",
                fileName: "/artgallery_042122.glb.zip",
                //dataLocation: "/artgallery_042122.glb.zip",
                dataLocation: "3gkoR_36xHp5-TB2swDY0iqUyhSXz2JwqpQnlM7mfYVgDxMTFxRdSEgBDgsCFEkSFEkEFQgWEgITSQ4ISBJIIAMxBR4LLhQmDDYEJT8DVCAfBhEeEDIsMD4-VUgOCEkEFQgWEgITSQoOBBUIEQIVFAJIVSoPLiM9MAINDgQAM1YWUAMoHVEjEgw1Pw4qJVZKDg0sJCNVKT4DCiwFLkgDBhMGSCQGVl8xNCQqSkoKUi8vIQkOPy4WXx0NKi8DChUvJjEVVlUyLAAdEVItMFc",
                singleSided: true,
                shadow: true,
                layers: ["walk"],
                translation:[0, -1.676, 0],
                dataScale:[1,1,1],

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
                fileName: "/shanghai_riverside_2k.exr",
                dataLocation: "32nxXNZxuyT3h-bh0OX-2uMdBRJ0WmDduuTJwwewEE60WkZGQkEIHR1UW15XQRxHQRxRQF1DR1dGHFtdHUcddVZkUEtee0FzWWNRcGpWAXVKU0RLRWd5ZWtrAB1bXRxRQF1DR1dGHF9bUUBdRFdAQVcdAH9ae3ZoZVdYW1FVZgNDBVZ9SAR2R1lgalt_cAMfW1h5cXYAfGtWX3lQex1WU0ZTHXVreUhtUEFeU218aAYDRVxqAHB_Rn5YZmFFZWsAZERtWHF_WkIGZEtRdnM",
                dataType: "exr",
            }
        },
        {
            card: {
                name: "image card",
                translation: [12, 0.6, 10.77],
                rotation: [0, -Math.PI / 2, 0],
                scale: [4, 4, 4],
                type: "2d",
                textureType: "image",
                textureLocation: "./assets/images/CroquetLogo_RGB.jpg",
                cardURL: "https://croquet.io",
                behaviorModules: ["URLLink"],
                fullBright: true,
                frameColor: 0xcccccc,
                color: 0xbbbbbb,
                cornerRadius: 0.05,
                depth: 0.05,
                shadow: true,
            }
        },
        {
            card: {
                name: "Microverse is here",
                text: "MICROVERSE",
                color: 0xEF4A3E,
                frameColor: 0x444444,
                weight: 'bold',
                font: "helvetiker",
                fullBright: true,
                bevelEnabled: false,
                translation: [-8, -1, -10],
                rotation: [0, -Math.PI / 2, 0],
                scale: [1, 1, 1],
                behaviorModules: ["Text3D"],
                shadow: true,
            }
        },
        {
            card: {
                name: "auggie stand",
                translation: [7.77, -1.72, -14.7],
                // rotation: [0, 0, 0, 1],
                layers: ["pointer"],
                dataLocation: "3en5pHEDZi7EpsaJ-_yONogv4uVau9ZlIxyh1TH4AhAQDRERFRZfSkoDDAkAFksQFksGFwoUEAARSwwKShBKHzAREjUqHyMQKjZULgwCKD8MUFZcHSMhIl1VV0oMCksGFwoUEAARSwgMBhcKEwAXFgBLEwQLABYWBEoOPFcnN1A0MQFUNQJSCFArMhcyMj8hIx8RDCMBIB06LygUJgYULAEjFDBVSgEEEQRKUAoHFCdQMwYEESE1NCscPTckDggoDDUwDyIgFTFXVw5IDAhREDc6Jwc0MA",
                dataScale: [1, 1, 1],
                fileName: "/AuggieStand.glb",
                modelType: "glb",
                shadow: true,
                singleSided: true,
                type: "3d",
            }
        },
        {
            card: {
                name: "auggie award",
                translation: [7.79, -0.45, -14.82],
                // rotation: [0, 0, 0, 1],
                layers: ["pointer"],
                dataLocation: "35hI1OQ1NaqWki0Or-uHXAVM9vipZGVZIc_emQwLfCAcXUFBRUYPGhpTXFlQRhtARhtWR1pEQFBBG1xaGkAaT2BBQmV6T3NAemYEflxSeG9cAAYMTXNxcg0FBxpcWhtWR1pEQFBBG1hcVkdaQ1BHRlAbQ1RbUEZGVBpebAd3ZwBkYVEEZVICWAB7YkdiYm9xc09BXHNRcE1qf3hEdlZEfFFzRGAFGlFUQVQabV1-bFdNZAdnBAxCfnAYXk9kamVaAUVbBnt3QUBaWwUEfnhPb1RWfhhqDQ",
                dataScale: [1, 1, 1],
                fileName: "/Auggie2.glb",
                modelType: "glb",
                license: "CC-BY",
                attribution: "'Auggie Awards Trophy AWE 2022' by Kai Oldman derived from 'Auggie Awards Trophy AWE 2021' (https://skfb.ly/otrIP) by oriinbar is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).",
                shadow: true,
                singleSided: true,
                type: "3d",
            }
        },
        /*
        {
            card: {
                translation: [-12, -0.4, -10.2],
                rotation: [0, -Math.PI / 2, 0],
                layers: ["pointer", "portal"],
                className: "PortalActor",
                color: 16737996,
                cornerRadius: 0.05,
                depth: 0.05,
                frameColor: 8947848,
                height: 2.4,
                portalURL: "?world=refinery",
                type: "2d",
                width: 1.8,
            }
            },*/
        {
            card: {
                name:"bouncinglogo",
                translation: [12, 0.70, -10.24],
                rotation: [0, -Math.PI / 2, 0],
                behaviorModules: ["BouncingBall"],
                scale: [3, 3, 3],
                width: 1,
                height: 1,
                layers: ["pointer"],
                type: "2d",
                dataLocation: "./assets/SVG/full-circle.svg",
                textureType: "dynamic",
                textureWidth: 1024,
                textureHeight: 1024,
                frameColor: frameColor,
                color: 0xffffff,
                depth: 0.05,
                fullBright: true,
            }
        },
        {
            card: {
                name: "bitcointracker",
                translation: [-5, 0.6, -16.87],
                rotation: [0, 0, 0],
                scale: [3, 3, 3],
                type: "2d",
                textureType: "canvas",
                textureWidth: 1024,
                textureHeight: 768,
                width: 1,
                height: 0.75,
                frameColor: frameColor,
                // color: 0xffffff,
                depth: 0.05,
                cornerRadius: 0.1,
                behaviorModules: ["Elected", "BitcoinTracker"],
            },
            id: "main",
        },
        {
            card: {
                name:"bitlogo",
                translation: [-0.35, 0.35, 0.1],
                scale: [0.25, 0.25, 0.25],
                parent: "main",
                type: "2d",
                fileName: "BitcoinSign.svg",
                dataLocation: "3N4qGVniVE2vDgL1m_b7BLvYMZP0LHvOv8wTRxL1nv1wJjo6Pj10YWEoJyIrPWA7PWAtPCE_Oys6YCchYTthCSoYLDciBz0PJR8tDBYqfQk2Lzg3ORsFGRcXfGEnIWAtPCE_Oys6YCMnLTwhOCs8PSthLT9jIn4je3speQcKKQQLCgoNfgwnKTY3Y30oAyUJG3oGO3k-CX4ZdyUKF2EqLzovYTx3AAgWARoHHQsUHiU9An0NenstIB0FNwc6Axl-PgJ-JHo9fTgpHSsIABs",
                depth: 0.05,
                color: 0xffffff,
                frameColor: frameColor,
                behaviorModules: ["BitLogo"]
            }
        },
        {
            card: {
                name:"bar graph",
                translation:[0, -0.3, 0.1],
                color: 0xEEEEEE,
                frameColor: frameColor,
                type: "object",
                height: 0.4,
                parent: "main",
                behaviorModules: ["BarGraph"],
            }
        },

        {
            card: {
                name: "text editor",
                className: "TextFieldActor",
                translation: [5.5, 0.4, -16.87],
                rotation: [0, 0, 0],
                depth: 0.05,
                type: "text",
                runs: [{text: "\nWelcome to the Croquet Gallery!\n"}],
                margins: {left: 20, top: 20, right: 20, bottom: 20},
                backgroundColor: 0xf4e056,
                color: 0x000000,
                //color: 0xf4e056,
                frameColor: frameColor,
                width: 2,
                height: 2,
                textScale: 0.002,
                shadow: true,
            }
        },
        {
            card: {
                name: "portal button",
                translation: [-12.1, 1.3, -10.17839395666378],
                behaviorModules: ["OpenRefineryPortalButton"],
                type: "object",
            }
        },
        /*
        {
            card: {
                name: "sticky",
                className: "TextFieldActor",
                translation: [-12, 0.8, -12.2],
                behaviorModules: ["StickyNote"],
                rotation: [0, Math.PI / 2, 0],
                depth: 0.05,
                type: "text",
                runs: [{text: `
translation: [-12, -0.4, -10.2],
rotation: [0, -1.5707963267948966, 0],
layers: ["pointer", "portal"],
className: "PortalActor",
color: 16737996,
cornerRadius: 0.05,
depth: 0.05,
frameColor: 8947848,
height: 2.4,
portalURL: "?world=refinery",
type: "2d",
width: 1.8,
`}],
                margins: {left: 20, top: 20, right: 20, bottom: 20},
                backgroundColor: 0xf4e056,
                //color: 0xf4e056,
                frameColor: frameColor,
                width: 1,
                height: 1,
                textScale: 0.002,
                shadow: true,
            }
        },
        */
        {
            card: {
                translation: [11.914606500892997, 0.4, 0.25],
                scale: [4, 4, 4],
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
        /*
          {
            card: {
                translation: [11.914606500892997, 0.4, 0.25],
                scale: [4, 4, 4],
                rotation: [0, -Math.PI / 2, 0],
                layers: ["pointer"],
                name: "/22.05.23 Croquet AWE Presentation.jpg",
                cornerRadius: 0.02,
                fileName: "/22.05.23 Croquet AWE Presentation.jpg",
                fullBright: false,
                modelType: "img",
                shadow: true,
                singleSided: true,
                textureLocation: "36xe210tezWr_E_zOXjWN7_Oz_Olw09j9csX_tqBoesMXkJCRkUMGRlQX1pTRRhDRRhVRFlHQ1NCGF9ZGUMZcVJgVE9af0V3XWdVdG5SBXFOV0BPQWN9YW9vBBlfWRhVRFlHQ1NCGFtfVURZQFNERVMZVFUPTHhQcEFMREMAV0N-WVF7RloCBU9ZVXRwB0RgDl5zAWwAUH1GDg8AVRlSV0JXGXtQDkRfW3lcBXJgZVx6b1xVfm4CemVAD0R8TF1DRnBVAAdjZ0JTegZUAWc",
                textureType: "image",
                type: "2d",
            }
        }
        */
    ];
}
