// tutorial2.js
// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = [
        "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
    ];

    Constants.SystemBehaviorDirectory = "behaviors/croquet";
    Constants.SystemBehaviorModules = [
        "menu.js", "elected.js", "propertySheet.js", "stickyNote.js", "avatarEvents.js", "pdfview.js"
    ];

    Constants.UserBehaviorDirectory = "behaviors/default";
    Constants.UserBehaviorModules = [
        "demo.js", "lights.js", "bouncingBall.js", "bitcoinTracker.js", "spin.js", "openPortal.js"
    ];

    const frameColor = 0x888888;

    Constants.DefaultCards = [
        {
            card: {
                name:"world model",
                type: "3d",
                dataLocation: "./assets/3D/artgallery_042122.glb.zip",
                singleSided: true,
                shadow: true,
                layers: ["walk"],
                translation:[0, -1.7, 0],
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
                dataLocation: "./assets/sky/shanghai_riverside_2k.exr",
                dataType: "exr",
            }
        },
        {
            card: {
                name: "image card",
                translation: [0, 0.4, -10],
                //rotation: [0, Math.PI / 2, 0],
                scale: [4, 4, 4],
                type: "2d",
                textureType: "image",
                textureLocation: "./assets/images/CroquetLogo_RGB.jpg",
                fullBright: true,
                frameColor: 0xcccccc,
                color: 0xbbbbbb,
                cornerRadius: 0.05,
                depth: 0.05,
                shadow: true,
            }
        },
        /*
        {
            card: {
                translation: [-12, -0.4, -10.2],
                rotation: [0, Math.PI / 2, 0],
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
                translation: [-4.5, 0.4, -10],
                rotation: [0, Math.PI, 0],
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
                translation: [5, 0.5, -10],
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
                dataLocation: "./assets/SVG/BitcoinSign.svg",
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
                translation: [11.914606500892997, 0.4, -10],
                rotation: [0, -Math.PI / 2, 0],
                depth: 0.05,
                type: "text",
                runs: [{text: "\nWelcome to the Croquet Gallery!\n"}],
                margins: {left: 20, top: 20, right: 20, bottom: 20},
                backgroundColor: 0xf4e056,
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
rotation: [0, 1.5707963267948966, 0],
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
                name: "/22.05.23 Croquet AWE Presentation.pdf",
                color: 8947848,
                depth: 0.05,
                fileName: "/22.05.23 Croquet AWE Presentation.pdf",
                frameColor: 16777215,
                fullBright: true,
                modelType: "pdf",
                pdfLocation: "30zU7vniWF26Egbynrz8yyHD0fxWZ_FQC2-_h4Aqo768WEREQEMKHx9WWVxVQx5FQx5TQl9BRVVEHllfH0Ufd1RmUklceUNxW2FTcmhUA3dIUUZJR2V7Z2lpAh9ZXx5TQl9BRVVEHl1ZU0JfRlVCQ1UfHQhbQgABCXxJZERhU2kGfF5famIdWVFjeQUESV9de3p0AG9dCQRUd2NpeR9UUURRHwUJXmlkSmdpeWUFeVZIAAdBAXl3fGBYXgZDWWVvdGcJVVt8d19FdgMBUVM",
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
