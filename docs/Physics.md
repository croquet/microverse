# The Rapier Physics Engine in Croquet Microverse

[https://croquet.io](https://croquet.io)

## Introduction

The Croquet Microverse can use the [Rapier Physics Engine](https://rapier.rs/docs/user_guides/javascript/getting_started_js) to build a world with cards that obey the simulated law of physics.

Rapier simulates the motion of the objects bit-identically on the model side. In other words, the simulation is decoupled from the visual appearances. The Microverse provides a behavior module called "Physics" (`behaviors/croquet/physics.js`). The rest is all done in the "user land"; you can see an example behavior module called "Cascade" in `behaviors/default/cascade.js` and the refinery world where it is used.

You can instantiate multiple Rapier Worlds in one Microverse world. The Rapier Worlds may have separate simulation time steps or even different gravity constant. The objects in one Rapier world don't interact with object in other Rapier worlds.

Alternatively, you can instantiate one "global Rapier world for a Microverse world. All physics objects in this world will interact with each other. This mode of execution is sometimes useful if you are making a custom Microverse world.

First let us look at `worlds/refinery.js`. The last card has `CascadeBox` behavior module. The `Box` in the name signifies that it is a separate Physics simulation in a box.


```JavaScript
{
    card: {
        name:"cascade box",
        type: "object",
        layers: ["pointer"],
        translation: [-20, 0.5, 64],
        rotation: [0, Math.PI, 0],
        behaviorModules: ["CascadeBox"],
    }
}
```

In `cascade.js`. The first behavior in the file, `CascadeBoxActor` has this section in `setup()`:

```JavaScript
class CascadeActor {
    setup() {
        if (!this.physicsWorld) {
            let physicsManager = this.service("PhysicsManager");
            console.log("new physics world for cascade");
            this.setPhysicsWorld(physicsManager.createWorld({timeStep: 20}, this.id));
        }

```

This "box" sets up an instance of the Rapier physics World, with a proper time step.

Then, it creates some stationaly objects with `createCard()` calls. One of those looks like this:

```JavaScript
        this.base1 = this.createCard({
            name:"base",
            type: "object",
            layers: ["pointer", "walk"],
            behaviorModules: ["Physics", "Cascade"],
            rotation: [0.5, 0, 0],
            physicsSize: [5, 0.3, 3.5],
            color: 0x997777,
            physicsShape: "cuboid",
            physicsType: "positionBased",
            shadow: true,
            parent: this,
        });
```

The behavior modules for this card has `Physics`, which is a system behavior to enable the card to be a part of simulation, and `Cascade`, which adds the behavior of the object and defined in the same file.

Notice that the `parent` property is `this`. This makes the created object participate in the physics world that is created for the "cascade box" object. The translation is [0, 0, 0] that is in the referance frame of the cascade box.

The `CascadeActor` behavior is installed into those objects and ones created by the `SprayActor`. The `setup()` method of `CascadeActor` checks the `physicsType` and `physicsShape` to create a rigid body description and a collider description. There are two `call`s to `"Physics$PhysicsActor"` that invoke methods defined in the Physics behavior module.  The last part of `setup()` adds a bit of an interactive feature as well as the "kill plane".  The `translated()` method is called when the rigid body moves. The method checks the y-coodinates of the object, and then destroys itself when it falls out of the simulation. When a position of a rigid body goes to infinity, the Rapier simulation crashes. So it is a good idea to have a boundary in your simulation.

```JavaScript
...
        this.addEventListener("pointerTap", "jolt");
...
        this.listen("translating", "translated");
```

Alternatively, Physics bindings enables the intersectionEvents to fire. See the part of `setup()` that uses the `physicsSensor` property and how it enables the intersectionEvent callbacks.

The `CascadePawn` behavior creates a Three JS mesh with a simple geometry that matches with the value in "physicsShape". For the demo purposes, the creation of the mesh is guarded by `if (this.shape.children.length === 0)`, meaning that it does not replace a shape that is already there.

```JavaScript
class CascadePawn {
    setup() {
        if (this.shape.children.length === 0) {
            let physicsShape = this.actor._cardData.physicsShape;
            if (physicsShape === "ball") {
                let s = this.actor._cardData.physicsSize || 1;
                let geometry = new Microverse.THREE.SphereGeometry(s / 2, 32, 16);
                let material = new Microverse.THREE.MeshStandardMaterial({color: this.actor._cardData.color || 0xff0000});
                this.obj = new Microverse.THREE.Mesh(geometry, material);
                this.obj.castShadow = this.actor._cardData.shadow;
                this.obj.receiveShadow = this.actor._cardData.shadow;
```

To make a card that is not a "3d" type walkable, you have to manually construct the "walk collider" manually.

```JavaScript
        if (this.actor.layers.includes("walk")) {
            this.constructCollider(this.obj);
        }
```

And to prevent a double tap action from triggering the "jump to" feature, we remove the default handler for `pointerDoubleDown` and install a "no operation" action.

```JavaScript
        this.removeEventListener("pointerDoubleDown", "onPointerDoubleDown");
        this.addEventListener("pointerDoubleDown", "nop");
```

So this is it!  Note again that the property names, such as `physicsType`, `physicsShape`, `physicsSize` are all user defined. Those are used in this example, but you can define your own property and use it from your behaviors.

If you want to set up a Microverse world where you know that you want to have only one global Rapier World, you change the `setup()` method of `CascadeBoxActor` as follows:

```JavaScript
    let physicsManager = this.service("PhysicsManager");
    physicsManager.createGlobalWorld({timeStep: 20}, this.id);
```

By creating a `physicsManager.createGlobalWorld()`, accessing the `physicsWorld` property from any card will return the same world.

Also note that adding and removing a behavior can be done dynamically. You can start with a card that does not participate in the simulation but later you can add the card to the simulation by attaching "Physics" behavior. This gives you more flexibility in creating your own worlds.

**Copyright (c) 2022 Croquet Corporation**
