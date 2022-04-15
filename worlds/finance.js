// Copyright 2021 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.MaxAvatars = 6;
    Constants.AvatarNames = [
        "generic/1", "generic/2", "generic/3", "generic/4", "generic/5", "generic/6",
        "alice", "newwhite", "fixmadhatter", "marchhare", "queenofhearts", "cheshirecat"
    ];

    Constants.SystemBehaviorDirectory = "behaviors/croquet";
    Constants.SystemBehaviorModules = [
        "menu.js", "elected.js", "propertyPanel.js"
    ];

    Constants.UserBehaviorDirectory = "behaviors/default";
    Constants.UserBehaviorModules = [
        "lights.js", "spin.js",
    ];

    // const frameColor = 0x888888;

    const bases = [
        [11.21, -5.18, -6.43],
        [-10.84, -5.18, -6.43],
        [11.21, -5.18, -28.50],
        [-10.84, -5.18, -28.50],
    ];

    const kioskScale = [49, 49, 49];

    Constants.DefaultCards = [
        {
            card: {
                name:'wall st',
                translation: [0, -28, -22],
                rotation: [0, -Math.PI / 2, 0],
                dacaScale: [1, 1, 1],
                scale:[30, 30, 30],
                layers: ['walk'],
                type: "3d",
                dataLocation: "382dPYZZisTwo9nBMWH-PVxkxc_jsuBWWpefamX3HEmIUExMSEsCFxdeUVRdSxZNSxZbSldJTV1MFlFXF00Xf1xuWkFUcUt5U2lbemBcC39AWU5BT21zb2FhChdRVxZbSldJTV1MFlVRW0pXTl1KS10XUQ1uU3Jrdk5iUXNaT351QE9rFXFPQEFeXmsIXwoIDn9cWUB0DX5bdhVBWxdcWUxZF3RMC3EBdmlCVEpfAXdKSAt3UkxfW1JMdnxgT1p9SV5tV10JTFcIVw1_fG0",
                fileName: "/wallst_041422.glb",
                modelType: "glb",
                singleSided: true,
                shadow: true,
                placeholder: true,
                placeholderSize: [40, 1, 40],
                placeholderColor: 0x808080,
                placeholderOffset: [0, 0.4, 0],
            }
        },
        {
            card: {
                name: 'light',
                layers: ['light'],
                type: "lighting",
                behaviorModules: ["Light"],
                dataLocation: "./assets/sky/abandoned_parking_4k.jpg",
                dataType: "jpg",
            }
        },
        ...bases.map((tr, i) => {
            return [{
                card: {
                    translation: tr,
                    scale: kioskScale,
                    rotation: [0, 0, 0],
                    dataScale: [1, 1, 1],
                    name: `/Kiosk_base ${i}`,
                    dataLocation: "3uwJbJUTFDggxMNRMBFWEcjbUbjLKF2bjBfjXQHwyj8wHQEBBQZPWloTHBkQBlsABlsWBxoEABABWxwaWgBaMhEjFwwZPAY0HiQWNy0RRjINFAMMAiA-IiwsR1ocGlsWBxoEABABWxgcFgcaAxAHBhBaIAQYQwMzJjhCGjpARBInQwMiHk1AQjwwOTwMTTs2RTMjHx4CAQ0lDy8nHloRFAEUWgM_PDcjRxMbEBsqDxciRgEjQAYWQ0YyIEJHPzgPIC0sGS8zLA0DQEZMECQ",
                    fileName: "/Kiosk_base.glb",
                    modelType: "glb",
                    shadow: true,
                    singleSided: true,
                    type: "3d",
                }
            }, {
                card: {
                    translation: tr,
                    scale: kioskScale,
                    rotation: [0, 0, 0],
                    dataScale: [1, 1, 1],
                    name: `/Kiosk_screen_1 ${i}`,
                    dataLocation: "36G5zWCENgH_RVPrDs97pgKCF6xyxo7wLbqPBNjQfh14XkJCRkUMGRlQX1pTRRhDRRhVRFlHQ1NCGF9ZGUMZcVJgVE9af0V3XWdVdG5SBXFOV0BPQWN9YW9vBBlfWRhVRFlHQ1NCGFtfVURZQFNERVMZY0dbAEBwZXsBWXkDB1FkAEBhXQ4DAX9zen9PDnh1BnBgXF1BQk5mTGxkXRlSV0JXGUNSB2ZFXkVTBFhdQUJMAFUOBxtRV3BgBxt-TlxQQHxZTFJlcHVSAgNVVwY",
                    fileName: "/Kiosk_screen_1.glb",
                    modelType: "glb",
                    shadow: true,
                    singleSided: true,
                    type: "3d",
                }
            }, {
                card: {
                    translation: tr,
                    scale: kioskScale,
                    rotation: [0, 0, 0],
                    dataScale: [1, 1, 1],
                    name: `/Kiosk_screen_2 ${i}`,
                    dataLocation: "3EcXJhKGfgQaI8FSUi9FNsqEYdzuj3hraTyE5C0SX6p4LTExNTZ_amojLCkgNmswNmsmNyo0MCAxaywqajBqAiETJzwpDDYELhQmBx0hdgI9JDM8MhAOEhwcd2osKmsmNyo0MCAxaygsJjcqMyA3NiBqEDQoczMDFghyKgpwdCIXczMSLn1wcgwACQw8fQsGdQMTLy4yMT0VPx8XLmohJDEkaj0BDgcQL3NyMQM1fXw8chw2HQMjcTMsLzEnIw0UISQkExEkNhIdAXMsFCY",
                    fileName: "/Kiosk_screen_2.glb",
                    modelType: "glb",
                    shadow: true,
                    singleSided: true,
                    type: "3d",
                }
            }, {
                card: {
                    translation: tr,
                    scale: kioskScale,
                    rotation: [0, 0, 0],
                    dataScale: [1, 1, 1],
                    name: `/Kiosk_screen_3 ${i}`,
                    dataLocation: "3WtpqdkBp4D2G7obtU4Ps42SDs3MJ2SilFvK0jjPThy8PyMjJyRteHgxPjsyJHkiJHk0JTgmIjIjeT44eCJ4EDMBNS47HiQWPAY0FQ8zZBAvNiEuIAIcAA4OZXg-OHk0JTgmIjIjeTo-NCU4ITIlJDJ4AiY6YSERBBpgOBhiZjAFYSEAPG9iYB4SGx4ubxkUZxEBPTwgIy8HLQ0FPHgzNiM2eGUPBC8vYhkAOWc1ECBkGwUEFjM2DjAkZxoDIghkLjUzbhYgPR0ULiMaJG8",
                    fileName: "/Kiosk_screen_3.glb",
                    modelType: "glb",
                    shadow: true,
                    singleSided: true,
                    type: "3d",
                }
            }];
        }).flat()
    ];
}
