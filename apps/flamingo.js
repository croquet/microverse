import { DCardActor, DCardPawn } from '../src/DCard.js';
import { q_euler } from '@croquet/worldcore';

export function constructFlamingo(height, radius){
    FlamingoCard.create({
        scale: [5,5,5],
        offset: [-radius,height,0], // offset the flamingo model from the center
        model3d: './assets/3D/Flamingo.glb.zip',
    });
}

class FlamingoCard extends DCardActor{
    init(options){
        super.init(options);
        this.fly();
    }

 //   get pawn(){ return FlamingoPawn}

    fly(){
        this.future(20).fly();
        this.rotateTo(q_euler(0, this.now()/9000,0));
    }

    version(){return '0.03'}
}

FlamingoCard.register('FlamingoCard');
