# The Public Interface of WalkManager

[https://croquet.io](https://croquet.io)

## Introduction
Croquet Microverse has a pluggable mechanism to specify how your avatar should walk (or fly) in the 3D scene. By default 3D models marked with the "walk" layer build geometry to test collision, and the avatar uses them to stay on a "ground" or collide with a wall. But the world you would like to build may require more elaborated logic for avatar to move around in the world. 

The view-side `WalkManager` provides a way to customize how an avatar moves around in a world.

## WalkManager

The WalkManager effectively maintains an array of behavior methods to invoke in series. (N.B. The behaviors don't have to be installed into the avatar.) You can consider the array as a pipeline, where the proposed new "pose" (the translation and rotation of the avatar) is passed in, and the resulting new pose determines the actual pose of the avatar.

The core of the WalkManager looks like the following.

```JavaScript
walk(avatar, vq, time, delta) {
    for (let i = 0; i < this.walkers.length; i++) {
        let walker = this.walkers[i];
        let behavior = avatar.actor.behaviorManager.lookup(walker[0], walker[1]);
        let [newVq, isFinal] = behavior.invoke(avatar, walker[2], vq, time, delta);
        if (isFinal) {
            return newVq;
        }
        vq = newVq;
    }
    return vq;
}
```

Each "kernel" in the pipeline takes the local avatar the pose (it consists of vector3 for position and quaternion for rotation thus called `vq`, the current wall clock time (`time`) and the wall clock time difference from the last update (`delta`). Each kernel proposes a new position, and a boolean flag `isFinal`, that states that the result from the kernel should be used as the final position (in cases such as the kernel determined that the avatar should go to a particular place anyway, or a flying avatar may determine that no more checks with collidable ground model is necessary.).

The "vq" returned from this method is used by the avatar to move to the position and rotation.

The `setupDefaultWalkers()` method of `WalkManager` sets up three kernels as the default pipeline.

```JavaScript
setupDefaultWalkers() {
    [
        ["BuiltinWalker", "WalkerPawn", "checkPortal"],
        ["BuiltinWalker", "WalkerPawn", "backoutFromFall"],
        ["BuiltinWalker", "WalkerPawn", "bvh"]
    ].forEach((spec) => this.append(spec));
```

The `checkPortal` method checks if the avatar collides with a portal (thus it will be transferred to a connected world`. the `backoutFromFall` method checks if it is in a situation where the avatar has no walkable surface in the negative Y direction, and if that is the case, it tries to go back to a previous safe position. the `bvh` method checks the models with the `walk` layer and use the Bounded Volume Hierarchy geometry to efficiently compute the new position.

The Mythos project is an example of the custom walk logic. (`https://github.com/croquet/mythos/behaviors/default/walk.js`). The pipeline in the project consists of `checkPortal`, `bvh` and new `checkHillside` method defined in the file. The `checkHillside` method obtains the "height" of the proposed position of the avatar from procedurally generated terrains, and adjusts the y position. Because the procedurally generated terrain is infinitely large, we don't have to have the check done by `backoutFromFall`.

**Copyright (c) 2022 Croquet Corporation**
