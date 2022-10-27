# The Public Interface of AvatarActor and AvatarPawn

[https://croquet.io](https://croquet.io)

## Introduction

The "avatar" of Croquet Microverse handles user interaction such as mouse and keyboard. It also manages the "camera" of the 3D scene. The avatar is iamplemented as a special kind of [card](./Card.md). The default listeners for user interaction, such as the WASD key and pointer navigation, Ctrl-click (or Alt-click) editting etc. are specified in a behavior module so that you can override them from your behavior. You can also attach some other behaviors to add world-specific features.

The base actor class of the avatar is called AvatarActor, and the base pawn class is called AvatarPawn. Because it is a card, its visual appearance is specified in the same way for a 3D model-type card.

Other participants' avatars shown in the session are also cards; but they use a different kind of AvatarPawn called RemoteAvatarPawn.

The following shows the publicly useful methods of Avatar classes. Microverse uses the vector types defined in the Worldcore library. Those vectors are actually simple JavaScript Array. In the description below, the representation of `Vector3` and `Quatanion` are:

`type Vector3 = [<number>, <number, <number>]`

`type Quaternion = [<number>, <number, <number>, <number>]`

`type Matrix4 = [<number> x 16]`

## AvatarActor Properties

### `lookPitch:number`

The avatar's camera rotation around the X axis (the axis going from left to right; thus a positive value indicates to look "up", and a negative value indicates to look "down".)

To get desired effects, use the set method:

```JavaScript
this.set({lookPitch: n});
```

Typically you would set lookPitch and lookYaw at the same time:

```JavaScript
this.set({lookPitch: m, lookYaw: n});
```

### `lookYaw:number`

The avatar's camera rotation around the Y axis in the scene (the axis going from bottom to top; thus a positive value indicates to look east, and a negative value indicates to look west.

To get desired effects, use the `set()` method:

```JavaScript
this.set({lookYaw: n});
```

Typically you would set lookPitch and lookYaw at the same time:

```JavaScript
this.set({lookPitch: m, lookYaw: n});
```

### `lookOffset:Vector3

The offset in 3D coordinates between avatar's position and the camera's position. A typical third person view behind the avatar has [0, p, p], where p is a positive number.

While those three variables are used in the default `walkLook()` implementation, you can override the method to have a totally custom camera position. (see below.)

## AvatarActor Methods

### `goTo(v:Vector3, q:Quaternion, fall:boolean)`

Glide to the specified position and rotation in the global coordinate. The fall flag specifies whether the avatar should start falling to the ground or not.

### `goHome()`

Equivalent to call:

```JavaScript
goTo([0, 0, 0], [0, 0, 0, 1])
```

and

```JavaScript
        this.set({lookPitch: 0, lookYaw: 0});
```

as well as to notify the pawn by:

```JavaScript
        this.say("setLookAngles", {pitch: 0, yaw: 0, lookOffset: [0, 0, 0]});
```			  

### `dropPose(distance:Vector3, optOffset?:Vector3):{translation:Vector3, rotation:Quaternion}`

This method computes the position and rotation in front of the avatar at specified distance. The optional `optOffset` is added to the result in the reference frame of the avatar.

### `translateTo(v:Vector3)`

This method sets the translation of the avatar to the specified `[x, y, z]` coordinates.

### `rotateTo(q:Quotanion)`

This method sets the rotation of the avatar to the specified by a quaternion (`[x, y, z, w]`).

### `scaleTo(s:Vector3)`

This method sets the scale of the avatar to the specified by scale factors in [x, y, z] axis.

### `positionTo(v:Vector3, q:Quaternion)`

This method sets the translation and rotation of the avatar, making sure that those two values are used in the same logical time and used for the rendering.

## AvatarPawn Methods

### `lookTo(pitch:number, yaw:number, lookOffset:Vector3)`

Sets the coressponding actor's look configurations by publishing an event to the actor.

### `setOpacity(opacity:number)`

This method sets the opacity of the 3D model by assigning a different opacity value into the Three.js material.

### `goHome()`

This call initiates tells the actor to move back to [0, 0, 0], and resets rotation.

### `translateTo(v:Vector3)`

This method updates the local avatar pawn translation directly to the given value to have immediate screen update and publishes an event to set the corresponding actor's translation.

### `rotateTo(q:Quaternion)`

This method updates the local avatar pawn translation directly to the given value to have immediate screen update and publishes an event to set the corresponding actors's rotation.

### `scaleTo(s:Vector3)`

This method updates the local avatar pawn translation directly to the given value to have immediate screen update and publishes an event to set the corresponding actors's scale.

### `positionTo(v:Vector3, q:Quaternion)`

This method publishes an event to set the corresponding actors's translation and rotation. It guarantees that two values are sent in one message, thus causes both to be updated at the same time.

## AvatarEventHandler Behavior Module

The Microverse system automatically attaches a behavior module named `AvatarEventHandler` to the Avatar. Its default implementation is stored in `behaviors/croquet/avatarEvents.js`, but you can create a behavior with a similar structure to override the default functionality of some methods defined at AvatarPawn.

When the card spec for the avatar has the `avatarEventHandler` property, the behavior module with the name is used (instead of a module named `AvatarEventHandler`.  You can provide a custom action for a known method by defining a method at the pawn side behavior called `AvatarPawn`. (cf. `behaviors/croquet/halfBodyAvatar.js` in the source code).

Currently the following methods of the base AvatarPawn can be overridden. (In the source code the methods with `this.call(...handlerModuleName...)` lines checks if the named method exists in the behavior and calls if it does.)

### `startMotion(dx:number, dy:number)`

Called when the shell sends the `motion-start` DOM message from the Microverse shell, typically when the joystick is pressed down.

### `updateMotion(dx:number, dy:number)`

Called repeatedly when the shell sends the `motion-update` DOM message from the Microverse shell, typically when the joystick is moved from the off-center.

### `endMotion(dx:number, dy:number)`

Called when the shell sends the `motion-end` DOM message from the Microverse shell, typically when the joystick is released.

### `walkLook():Matrix4`

This method specifies the global camera position. The implementation can use various properties such as the global transformation of the avatar, lookPitch and other properties that the behavior defines.

### `walk(time:number, delta:number, vq:{v:Vector3, q:Quaternion})`

This method receives the time and "delta", which is the elapsed time since last display animation frame time, and the proposed "pose" of the avtar based on the user interaction. The default implementation moves the proposed position based on the BVH collision detection and testing the edge of the walkable terrain and returns another pose. You can override the movement by supplying the walk method at your AvatarPawn behavior. (Its details is somewhat implementation dependent so please consult the actual source code.)

### `pointerDown(evt)`
### `pointerUp(evt)`
### `pointerMove(evt)`
### `pointerMove(evt)`
### `pointerTap(evt)`
### `pointerWheel(evt)`
### `pointerDoubleDown(evt)`
### `keyDown(evt)`
### `keyUp(evt)`

Implementing them at the AvatarPawn overrides their actions. Note that the first responder and last responder mechanism is involved so some methods expects certain patterns. In general, you can simply copy the default implementation in `src/avatar.js` into your own behavior file as ther starting point for your own custom implementation.

### `mapOpacity(opacity:number):number`

This method controls the opacity used to render avatars. Typically a remote avatar close to yours become translucent. the custom implementation of `mapOpacity` defined at the AvatarPawn maps the value in the [0, 1] range.

**Copyright (c) 2022 Croquet Corporation**
