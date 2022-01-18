

import { Card } from './DCard.js';
import { TextureSurface } from './DSurface.js';
import { q_euler } from "@croquet/worldcore";

export function createChess(translation, scale, rotation){
    let chessLightSurface = TextureSurface.create({url: './assets/images/light-wood.jpg'});

    let chessDarkSurface = TextureSurface.create({url: './assets/images/dark-wood.jpg'});
    let svg = 'chess-board-solid.svg';
    let black = Card.create(
    {
        cardShapeURL: './assets/SVG/'+svg,
        cardSurface: chessDarkSurface,
        cardFullBright: false,
        cardDepth: 0.1,
        cardBevel:0.02,
        cardColor:[1,1,1], // white
        cardRotation:q_euler(Math.PI/2,0,0),
        translation: translation,
        scale: scale,
        rotation: rotation,
        cardInstall: true,
        cardShadow: true
    });

    let white = Card.create(
        {
            cardShapeURL: './assets/SVG/'+svg,
            cardSurface: chessLightSurface,
            cardFullBright: false,
            cardDepth: 0.1,
            cardBevel:0.02,
            cardColor:[1,1,1], // white
            cardRotation:q_euler(-Math.PI/2, 0, 0),
            cardShadow:true
            //cardTranslation: [1,0,0],
        });
    black.addCard(white);
}