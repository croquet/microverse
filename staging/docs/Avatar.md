# The Public Interface of AvatarActor and AvatarPawn

## Introduction

The "avatar" of Croquet Microverse handles user interaction such as mouse and keyboard, manages the "camera" of the 3D scene.  The avatar is implemented as a special kind of a [card](./Card.md). The default listeners for user interaction, such as the WASD key and pointer navigation, Ctrl-Click editting etc. are specified in a behavior module so that you can implement a new set and turn on and off certain actions. You can also attach some other behaviors to add world-specific features.

The base actor class of the avatar is called AvatarActor, and the base pawn class is called AvatarPawn. Because it is a card, its visual appearance is specified in the same way for a 3D model-type card.

Other participants' avatars shown in the session are also cards. However, typically the card for an avatar is not on the "pointer" layer so usually you cannot drag it around or get the property sheet.

## AvatardActor Properties

### `lookPitch:number`

The avatar's camera rotation around the X axis (the axis going from left to right; thus a posivive value indicates to look "up" ,and a negative value indicates to look "down".)

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
`type Vector3 = Array<number, number, number>`

The offset in 3D coordinates between avatar's position and the camera's position. A typical third person view behind the avatar has [0, p, p], where p is a positive number.

## AvatarActor Methods

### `goTo(v:Vector3, q:Quaternion, fall:boolean)`
`type Vector3 = Array<number, number, number>`
`type Quaternion = Array<number, number, number, number>`

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
`type Vector3 = Array<number, number, number>`
`type Quaternion = Array<number, number, number, number>`

This method computes the position and rotation in front of the avatar at specified distance. The optional `optOffset` is added to the result in the reference frame of the avatar.

## AvatarPawn Methods

### `lookTo(pitch:number, yaw:number, lookOffset:Vector3)`
`type Vector3 = Array<number, number, number>`

Sets the coressponding actor's look configurations by publishing an event to the actor.


### `startMMotion(e:DOMEvent)`, continueMMotion(e:DOMEvent), endMMotion(e:DOMEvent)`

These methods handles the user interaction from the joystick.

### `setOpacity(opacity:number)`

This method sets the opacity of the 3D model by assigning a different opacity value into the Three.js material.

### `goHome()`

This call initiates tells the actor to move back to [0, 0, 0], and resets rotation.
