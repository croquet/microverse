// Copyright 2022 by Croquet Corporation, Inc. All Rights Reserved.
// https://croquet.io
// info@croquet.io

export function init(Constants) {
    Constants.AvatarNames = [
        "newwhite", "madhatter", "marchhare", "queenofhearts", "cheshirecat", "alice"
    ];

    Constants.UserBehaviorDirectory = "behaviors/financial";
    Constants.UserBehaviorModules = [
        "lights-financial.js", "spin.js",
    ];

    // const frameColor = 0x888888;

    const floorHeight = -2;
    const kioskHeight = floorHeight;

    const bases = [
        [6.164617948413239, -2, -10.85337967226985],
        [-4.991730292590003, -2, 0.29729449346094544],
        [-4.961411414886032, -2, -22.01285987627673],
        [-16.17077144828993, -2, -10.846679003904795],
        //        [11.21, -5.18, -6.43],
        //        [-10.84, -5.18, -6.43],
        //        [11.21, -5.18, -28.50],
        //        [-10.84, -5.18, -28.50],
    ];

    const kioskScale = [1, 1, 1];

    Constants.DefaultCards = [
        {
            card: {
                name:"wall st",
                translation: [0, floorHeight, -5],
                rotation: [0, -Math.PI / 4, 0],
                dataScale: [1, 1, 1],
                // scale: [30, 30, 30],
                layers: ["walk"],
                type: "3d",
                dataLocation: "38kv6PK9ULjCj0DTKt_v9fEwZqMKPke3TYq_2oTgm3vwUExMSEsCFxdeUVRdSxZNSxZbSldJTV1MFlFXF00Xf1xuWkFUcUt5U2lbemBcC39AWU5BT21zb2FhChdRVxZbSldJTV1MFlxZTlFcFllPXUtXVV0VWUhIF012cwxUD1p_SkpyDXBPTGhTXw5RV30JX11McA0MCntRAE96XGpaagh9aggXXFlMWRdpVntXfHZLfV0VDX1AT3B6XH1BYHR9FQxVenQNQkF_dV8JW04LXWt1DVdh",
                fileName: "/wallst_042122_nokiosk.glb",
                modelType: "glb",
                singleSided: true,
                shadow: true,
               // placeholder: true,
               // placeholderSize: [40, 1, 40],
               // placeholderColor: 0x808080,
               // placeholderOffset: [0, 0.4, 0],
            }
        },
        {
            card: {
                name: "light",
                layers: ["light"],
                type: "lighting",
                behaviorModules: ["FinantialLight"],
                dataLocation: "32nxXNZxuyT3h-bh0OX-2uMdBRJ0WmDduuTJwwewEE60WkZGQkEIHR1UW15XQRxHQRxRQF1DR1dGHFtdHUcddVZkUEtee0FzWWNRcGpWAXVKU0RLRWd5ZWtrAB1bXRxRQF1DR1dGHF9bUUBdRFdAQVcdAH9ae3ZoZVdYW1FVZgNDBVZ9SAR2R1lgalt_cAMfW1h5cXYAfGtWX3lQex1WU0ZTHXVreUhtUEFeU218aAYDRVxqAHB_Rn5YZmFFZWsAZERtWHF_WkIGZEtRdnM",
                fileName: "/shanghai_riverside_2k.exr",
                dataType: "exr",
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
                    dataLocation: "3iUmZWalKz-nfmVbadzV4ZYIodnWMy2u1MBxJop2gYZsAR0dGRpTRkYPAAUMGkccGkcKGwYYHAwdRwAGRhxGLg0_CxAFIBooAjgKKzENWi4RCB8QHjwiPjAwW0YABkcKGwYYHAwdRw0IHwANRwgeDBoGBAxECBkZRjlZMFg8JCE-ETM2UAQhMDofXS09EBwxJy8dLSY7EVldADkzOigYPww-DQJGDQgdCEYnCBEMJTNcPgcxJC8jMxMCHj89ECQAAx8qAlEqJQICLh9ZCAooKysRJiog",
                    fileName: "/kiosk_base.glb",
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
                    dataLocation: "36ujbsHZCFEIyPVeNHACIHAoAtoCRwMVDbriM0fsDZ1gXkJCRkUMGRlQX1pTRRhDRRhVRFlHQ1NCGF9ZGUMZcVJgVE9af0V3XWdVdG5SBXFOV0BPQWN9YW9vBBlfWRhVRFlHQ1NCGFJXQF9SGFdBU0VZW1MbV0ZGGWYGbwdje35hTmxpD1t-b2VAAnJiT0NueHBCcnlkTgYCX2ZsZXdHYFNhUl0ZUldCVxlmQWlGA2l1U3RhA3BbD30HZg9GVQdUG1IbelNSf1tMewZhb0cGY3BUQk5_",
                    fileName: "/kiosk_1.glb",
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
                    dataLocation: "3fiW6C1DWpOMXBgSfx1qWTHKHoBN0btTdAFu5SW4S_NoDhISFhVcSUkADwoDFUgTFUgFFAkXEwMSSA8JSRNJIQIwBB8KLxUnDTcFJD4CVSEeBxAfETMtMT8_VEkPCUgFFAkXEwMSSAIHEA8CSAcRAxUJCwNLBxYWSTZWP1czKy4xHjw5XwsuPzUQUiIyHxM-KCASIik0HlZSDzY8NScXMAMxAg1JAgcSB0lfEQwNPEs_LxYONw5SEiQkClEHKwE-NTw1HlM_DiFVXggACB4SVD9QFQoB",
                    fileName: "/kiosk_2.glb",
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
                    dataLocation: "3DH8MpBr7yGkdmUNRPIosDyx9A3bxumwvfv-LczVryDILDAwNDd-a2siLSghN2oxN2onNis1MSEwai0razFrAyASJj0oDTcFLxUnBhwgdwM8JTI9MxEPEx0ddmstK2onNis1MSEwaiAlMi0gaiUzITcrKSFpJTQ0axR0HXURCQwTPB4bfSkMHRcycAAQPTEcCgIwAAsWPHRwLRQeFwU1EiETIC9rICUwJWsXBzYWER4QHgppNg59Ly8MPTQGMXB0ATUoHhclMn02DS0PcCFydQh1Fw4V",
                    fileName: "/kiosk_3.glb",
                    modelType: "glb",
                    shadow: true,
                    singleSided: true,
                    type: "3d",
                }
            }];
        }).flat()
    ];
}
