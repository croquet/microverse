# The Public Interface of AvatarActor and AvatarPawn

[https://croquet.io](https://croquet.io)

## Introduction

The "avatar" of Croquet Microverse handles user interaction such as mouse and keyboard and manages the "camera" of the 3D scene.  The avatar is implemented as a special kind of [card](./Card.md). The default listeners for user interaction, such as the WASD key and pointer navigation, Ctrl-Click editting etc. are specified in a behavior module so that you can implement a new set and turn on and off certain actions. You can also attach some other behaviors to add world-specific features.

The base actor class of the avatar is called AvatarActor, and the base pawn class is called AvatarPawn. Because it is a card, its visual appearance is specified in the same way for a 3D model-type card.

Other participants' avatars shown in the session are also cards. However, typically the card for an avatar is not on the "pointer" layer so usually you cannot drag it around or get the property sheet.

Microverse uses the vector types defined in the Worldcore library. Those vectors are actually simple JavaScript Array. In the description below, the representation of `Vector3` and `Quatanion` are:

`type Vector3 = [<number>, <number, <number>]`

`type Quaternion = [<number>, <number, <number>, <number>]`

## AvatarActor Properties

### `lookPitch:number`

The avatar's camera rotation around the X axis (the axis going from left to right; thus a positive value indicates to look "up" ,and a negative value indicates to look "down".)

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

This method moves the translation of the avatar to the specified `[x, y, z]` coordinates.

### `rotateTo(q:Quotanion)`

This method sets the translation of the avatar to the specified by a quaternion (`[x, y, z, w]`).

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

This method updates the local avatar pawn translation directly to the given value to have immediate screen update and publishes an event to set the corresponding actors's rotation.

### `positionTo(v:Vector3, q:Quaternion)`

This method publishes an event to set the corresponding actors's translation and rotation. It guarantees that two values are sent in one message, thus causes both to be updated at the same time.

## AvatarEventHandler Behavior Module

The Microverse system automatically attaches a behavior module named `AvatarEventHandler` to the Avatar. Its default implementation is stored in `behaviors/croquet/avatarEvents.js`, and you can override the default behavior by supplying a behavior module with the same name. Currently, you need to explicitly override the system modules list with a list without default `avatarEvents.js`

```JavaScript
Constants.SystemBehaviorDirectory = "behaviors/croquet";
Constants.SystemBehaviorModules = [
    "elected.js", ... /* exclude "avatarEvents.js" */
];
```

and then add your own behavior module file that exports a module named `AvatarEventHandler`:

```JavaScript
Constants.UserBehaviorDirectory = "behaviors/myWorld";
Constants.UserBehaviorModules = [
    "avatar.js", ...
];
```

Currently the default implementation of the basic actions are still implemented at the `AvatarActor` and `AvatarPawn` in `src/avatar.js`. This mechanism give you flexibility to override some methods to customize the avatar's behavior.

**Copyright (c) 2022 Croquet Corporation**
