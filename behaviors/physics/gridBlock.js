
// gridblock.js
// Croquet Microverse
// A variable sized block object that aligns to a grid 1 to 1


class GridBlockActor {
    setup() {

    }
}

class GridBlockPawn {
    setup() {
        this.gridTexture = this.loadGrid();
        this.constructBlock();
    }

    loadGrid(){
        let assetManager = this.service("AssetManager").assetManager;
        const THREE = Microverse.THREE;
        const gridImage = `./assets/images/grid.png`
        let txtr = assetManager.fillCacheIfAbsent(gridImage, () => {
            let tex = new THREE.TextureLoader().load(gridImage);
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            return tex;
        }, this.id);
        return txtr;
    }

    setGrid(u, v){
        const THREE = Microverse.THREE;
        let gt = this.gridTexture.clone();

        gt.repeat = new THREE.Vector2(u,v);
        return gt;
    }

    constructBlock(){
        if (this.gridBlock) {this.gridBlock.removeFromParent();}
        const THREE = Microverse.THREE;
        let size = this.actor._cardData.blockSize;
        let geometry = new THREE.BoxGeometry( ...size );
        let [x,y,z] = [...size];
        let materials = [
            new THREE.MeshStandardMaterial({map:this.setGrid(z,y), color: 0x808080, side: THREE.FrontSide}),
            new THREE.MeshStandardMaterial({map:this.setGrid(z,y), color: 0x808080, side: THREE.FrontSide}),
            new THREE.MeshStandardMaterial({map:this.setGrid(x,z), color: 0x808080, side: THREE.FrontSide}),
            new THREE.MeshStandardMaterial({map:this.setGrid(x,z), color: 0x808080, side: THREE.FrontSide}),
            new THREE.MeshStandardMaterial({map:this.setGrid(x,y), color: 0x808080, side: THREE.FrontSide}),
            new THREE.MeshStandardMaterial({map:this.setGrid(x,y), color: 0x808080, side: THREE.FrontSide}),
        ];

        this.gridBlock = new THREE.Mesh( geometry, materials );
        this.gridBlock.receiveShadow = true;
        this.gridBlock.castShadow = true;
        console.log(this.gridBlock)
        console.log(size)
        this.shape.add(this.gridBlock);
        if (this.actor.layers.indexOf('walk') >= 0) {
            this.constructCollider(this.gridBlock);
        }
    }
}

export default {
    modules: [
        {
            name: "GridBlock",
            actorBehaviors: [GridBlockActor],
            pawnBehaviors: [GridBlockPawn],
        }
    ]
}




/*

const gridImage = './assets/images/grid.png';
const texture = new THREE.TextureLoader().load(gridImage);
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set( size[0], size[2] );
let pGeometry = new THREE.BoxGeometry(...size);
let pMaterial = new THREE.MeshStandardMaterial({map:texture, color: color, side: THREE.FrontSide});
*/

/* globals Microverse */
