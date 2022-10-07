// decimate.js
// Croquet Microverse
// Simplifies a 3D object's polygon structure


class DecimateActor {
    setup() {

    }
}

class DecimatePawn {
    setup() {
        // the 3D object will likely not be loaded yet. 
        this.simplifyTo = 0.875;
        if(this.object){
            this.modelLoaded(this.object);
        }else this.subscribe(this.id, "3dModelLoaded", "modelLoaded");
    }

    modelLoaded(object){
        console.log("DecimatePawn>>modelLoaded", object);
        if(object)this.object = object; // should be a no-op
        else this.object = this.shape.children[0]; // this is the original object
        return Promise.all([
            import("/assets/src/SimplifyModifier.js"),
        ]).then(([simplify]) => {
            if(this.simplified)this.simplified.removeFromParent();
            const modifier = new simplify.SimplifyModifier();
            this.simplified = this.object.clone();
            this.simplified.traverse( c=>{
                if(c.geometry){
                    const count = Math.floor( c.geometry.attributes.position.count * this.simplifyTo ); // number of vertices to remove
                    c.geometry = modifier.modify( c.geometry, count );
                    console.log(c.geometry)
                }
            });
            this.simplified.position.x = 3;
            this.simplified.rotation.y  = -Math.PI/2;
            this.shape.add(this.simplified);
        });

    }
}

export default {
    modules: [
        {
            name: "Decimate",
            actorBehaviors: [DecimateActor],
            pawnBehaviors: [DecimatePawn],
        }
    ]
}
