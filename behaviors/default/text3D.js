/* generate a 3D text object in your world
// Properties:
    text = the actual text string of the object e.g.  'MICROVERSE';
    color = a color value typically expressed in hex: 0xaaffaa;
    frameColor = if you want a different color for the extrusion.
    font = the font used - currently one of these:  'helvetiker', 'optimer', 'gentilis', 'droid/droid_sans', 'droid/droid_serif'
    weight = 'regular' or 'bold';
    depth = depth of extrusion in meters. THREE.TextGeometry refers to this as height
    height = height of text in meters. THREE.TextGeometry refers to this a size
    curveSegments = how much the curve of the font is sliced, typically 4 is good enough;
    bevelThickness = depth of the bevel in meters;
    bevelSize = distance from the font edge in meters;
    bevelEnabled = needs to be set to true in properties if you want it
// Copyright 2022 Croquet Corporation
*/


class Text3DPawn {
    setup() {
        this.generateText3D();
        this.listen("updateShape", "generateText3D");
    }

    generateText3D() {
        if (this.textMesh) {this.teardown();}
        let THREE = Microverse.THREE;
        let text = this.actor._cardData.text || 'MICROVERSE';
        let color = this.actor._cardData.color || 0xaaffaa;
        let frameColor = this.actor._cardData.frameColor || color;
        let font = this.actor._cardData.fFont || 'helvetiker'; // 'helvetiker', 'optimer', 'gentilis', 'droid/droid_sans', 'droid/droid_serif'
        let weight = this.actor._cardData.weight || 'regular';
        let depth = this.actor._cardData.depth || 0.05; // THREE.TextGeometry refers to this as height
        let height = this.actor._cardData.height || 0.25; // THREE.TextGeometry refers to this a size
        let curveSegments = this.actor._cardData.curveSegments || 4;
        let bevelThickness = this.actor._cardData.bevelThickness || 0.01;
        let bevelSize = this.actor._cardData.bevelSize || 0.01;
        let bevelEnabled = this.actor._cardData.bevelEnabled; // false unless set by user
        let emissive = this.actor._cardData.fullBright ? color : 0x000000;

        const loader = new THREE.FontLoader();
        loader.load( './assets/fonts/' + font + '_' + weight + '.typeface.json',  response => {

            let font = response;
            let materials = [
                new THREE.MeshPhongMaterial( { color: color, flatShading: true, emissive: emissive } ), // front
                new THREE.MeshPhongMaterial( { color: frameColor } ) // side
            ];
            if (emissive) {materials[0].emissive.setHex( emissive ).convertSRGBToLinear(); }
            let textGeo = new THREE.TextGeometry( text, {
                font: font,

                size: height, // Croquet refers to this as height
                height: depth, // Croquet refers to this as depth
                curveSegments: curveSegments,

                bevelThickness: bevelThickness,
                bevelSize: bevelSize,
                bevelEnabled: bevelEnabled

            });

            textGeo.computeBoundingBox();

            const centerOffset = - 0.5 * ( textGeo.boundingBox.max.x - textGeo.boundingBox.min.x );

            this.textMesh = new THREE.Mesh( textGeo, materials );
            this.textMesh.position.set(centerOffset,0,0);

            this.shape.add( this.textMesh );
        } );
    }

    teardown() {
        if (this.textMesh) {
            this.textMesh.removeFromParent();
            this.textMesh.geometry.dispose();
            this.textMesh.material[0].dispose();
            this.textMesh.material[1].dispose();
            delete this.textMesh;
        }
    }
}

export default {
    modules: [
        {
            name: "Text3D",
            pawnBehaviors: [Text3DPawn]
        }
    ]
}

/* globals Microverse */
