# Croquet Microverse Builder
## The Rapier Physics Engine in Croquet Microverse

**Copyright (c) 2022 Croquet Corporation**

<https://croquet.io>

<info@croquet.io>

## Introduction

The Croquet Microverse Builder can use the [Rapier Physics Engine](https://rapier.rs/docs/user_guides/javascript/getting_started_js) to build a world with cards that obey the simulated law of physics.

We use the Rapier bindings provided by [Worldcore](https://github.com/croquet/worldcore/blob/main/packages/rapier/src/RapierPhysics.js). Rapier simulates the motion of the objects bit-identically on the model side. In other words, the simulation is decoupled from the visual appearances. The Microverse provides a behavior module called "Rapier" (`behaviors/croquet/rapier.js`) that replaces `AM_RapierPhysics` from Worldcore. The rest is all done in the "user land"; you can see an example behavior module called "Collider" `behaviors/default/collider.js` and the default world where it is used.

First let us look at `default.js`. You can see that several cards with `Rapier` and `Collider` as their behavior modules:


```JavaScript
{
    card: {
        name:"c2",
        type: "object",
        layers: ["pointer"],
        translation: [bt[0] - 1, 19, bt[2]],
        behaviorModules: ["Rapier", "Collider"],
        rapierSize: [1, 1, 1],
        rapierShape: "cuboid",
        color: 0x00ff00,
        shadow: true,
    }
},
```

We can then check `collider.js` to see how it is used.

```JavaScript
class ColliderActor {
    setup() {
        let kinematic;
        let rapierType = this._cardData.rapierType;
        let rapierShape = this._cardData.rapierShape;
        if (rapierType === "positionBased") {
            kinematic = Worldcore.RAPIER.RigidBodyDesc.newKinematicPositionBased();
	...

        if (rapierShape === "ball") {
            let s = this._cardData.rapierSize || 1;
            s = s / 2;
            cd = Worldcore.RAPIER.ColliderDesc.ball(s);


```

The `setup()` method of `ColliderActor` checks the `rapierType` and `rapierShape`, and creates a rigid body description and the collider description. There are two `call`s to `"Rapier$RapierActor"`, which invoke the method defined in the Rapier behavior module.  The last part of `setup()` adds a bit of interactive feature, and also the "kill plane".  The `translated()` method is called when the rigid body is moved. The method checks the y-coodinates of the object, and then destroy itself when it fell out the simulation. When a position of a rigid body goes out of the range, Rapier simulation crashes. So it is a good idea to bound your simulation.

```JavaScript
        this.addEventListener("pointerTap", "jolt");
        this.listen("translating", "translated");
```

Alternatively, a new version of the Worldcore Rapier bindings enabled the contactEvents and intersectionEvents. See the part of `setup()` that uses the `rapierSensor` property and how it enables the contact- and intersectionEvent callbacks.

The `ColliderPawn` behavior creates a Three JS mesh with a simple geometry that matches with the value in "rapierShape". For a demo purpose, the creation of the mesh is guarded by `if (this.shape.children.length === 0)`, meaning that it does not replace a shape that is already there.

```JavaScript
class ColliderPawn {
    setup() {
        if (this.shape.children.length === 0) {
            let rapierShape = this.actor._cardData.rapierShape;
            if (rapierShape === "ball") {
                let s = this.actor._cardData.rapierSize || 1;
                let geometry = new Worldcore.THREE.SphereGeometry(s / 2, 32, 16);
                let material = new Worldcore.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
                this.obj = new Worldcore.THREE.Mesh(geometry, material);
```

To prevent a double tap action from triggering the "jump to" feature, we remove the default handler for `pointerDoubleDown` and install a "no operation" action.

```JavaScript
        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");
```

So this is it!  Note again that the property names, such as `rapierType`, `rapierShape`, `rapierSize` are all "user defined". Those are used in this example, but you can define your own property and use it from your behaviors.

Also note that adding and removing a behavior can be done dynamically. You can start with an card that does not participate in the simulation but later you can add the card to the simulation by attaching "Rapier" behavior. This gives you more flexibility in creating your own worlds.
