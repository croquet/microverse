# The Public Interface of CardActor and CardPawn

## Introduction

A card in Croquet Microverse is represented with a class called CardActor on the Croquet's Model side, and CardPawn on the Croquet's View side.

An instance of CardActor and CardPawn can have a list of behaviors. Each of such behavior can use the features provided by the CardActor or CardPawn to which it is attached. For example, A CardActor implements a method called `createCard()`, which takes a card spec and creates a new card and place it in the world. A behavior can simply call:

```JavaScript
  this.createCard({...});
```

to invoke the feature of the CardActor. This document shows all public methods on CardActor and CardPawn that can be used from your behaviors.

Also, properties of CardActor or CardPawn can be read and written in a simple form:

```JavaScript
let a = this.foo;
```

or

```JavaScript
this.foo = 42;
```

Note that multiple behaviors installed to the same CardActor (or CardPawn) share the same property.

## CardActor Properties

Due to the naming scheme of Worldcore, the properties tend to be prefixed with an underscore "_". For example, the intrinsic property to denote the translation of the card is stored in `_translation`. A behavior can read out the value by `this._translation`. However, setting an intrinsic property directly `this._translation = [1, 2, 3]` itself typically does not have desired effects, as the view needs to be notified. Typically a setter method such as `translateTo()` is used.

When Worldcore's `set()` method is used in this form:

```
this.set({translation: [1, 2, 3]});
```

The property `_translation` is updated and then an event with the property name with "Set" attached is published.

### `_translation`
`Array<number, number, number>`

The [x, y, z] translation of the card.

### `_rotation`
`Array<number, number, number, number>`

The rotation of the card in quaternion.

### `_scale`
`Array<number, number, number>`

The scale of the card in three axes.

### `_layers`
`Array<string>`

The layers property specifies how the card is treated when a special action is taken. Typical value are as follows:

* "walk": The avatar stays on the geometry of the card.
* "pointer": The pointer action is enabled.
* "portal": the avatar tests if the card it is going through needs to take the avatar to a connected world.

### `_parent`
The cards in the world are organized in a hierarchical parent-children structure. The `_parent` specifies its parent. Note that this is a "logical" structure. All cards are held as a direct child of the Three.JS scene, with automatic matrix composition for nested cards.

### `_behaviorModules`
`Array<string>`
The list of behavior modules installed to the card.

### `_name`
`string`

An informative string for the card.

### `_cardData`

Any other values that the CardActor holds are stored in an object stored in the `_cardData` property. This is needed to mark the values to be stored in the persistent data. 

## CardActor Methods

### `createCard(cardSpec:object):CardActor`

This method creates a new card (a CardActor on the model side and a CardPawn on the view side), based on the `cardSpec`.

### `queryCards(options?:{behaviorName?:string, methodName:string}, requestor?:Actor):Array<CardActor>

This method queries all existing cards in the world. When options is not speficied, all card actors are returned as an array. If options and reequestor are specified, you can filter them based on the boolean-valued method specified by behaviorName and methodName on the requestor.

If behaviorName is specified, a behavior method attached to requestor, specified by the behaviorName and methodName is invoked for each card. If only methodName is specified, the method from the base CardActor is invoked for each card. The method is expected to return a boolean value, and used to filter the list of cards to be returned.

### `destroy()`

This method removes the card from the world. All `teardown()` method of installed pawn behaviors and actor behaviors are called before the CardActor is removed from the system.

### `call(behaviorName:string, methodName:string, ...values:Array<any>):any`

This method invokes a method of another behavior. The `behaviorName` has to be in one of the form of:

* *ModuleName*$*BehaviorName*
* *BehaviorName*

When the first form is used, it specifies the globally known module name and the behavior with the name on the actor side of the module.  When the second form is used, it specified the behavior in the same module as the calling behavior.

The `methodName` is the name of the method, and `values` are variable-length arguments for the method.

### `future(time:number)`

This method schedules a future call in the specified logical time in milliseconds. If it is used in this form:

```JavaScript
this.future(20).mth();
```

`mth` of the same behavior will be invoked 20 milliseconds from logical `now`. If you would like to call a method of another module or behavior, you can use `call()`:

```JavaScript
this.future(20).call("Module$Behavior", "mth");
```

### `setCardData(options:object)`

This method updates some elements in the `_cardData` object. The current value and the new values are merged to create the new `_cardData` object. As a side effect, it publishes `cardDataSet` Croquet event that can be handled by the pawn or any other subscribers.

### `addEventListener(eventName:EventName, listener:function|string)`
`type EventName = "pointerDown"|"pointerUp"|pointerMove"|"pointerTap"|"pointerLeave"|"pointerEnter"|"wheel"|"doubleDown"|"click"|"keyUp"|"keyDown"`

This method adds a "listener" to be invoked when an event occurs on the card.  When `listener` is a function, it has to have a form of `this.mthName` where `mthName` is an existing method name of CardActor or the behavior itself. When listener is a string, it has to be the name of a method at CardActor or the behavior itself. The listener added by this Actor-side `addEventListener()` is invoked when any user in the world causes the corresponding user pointer or key event.

The pointerTap event is generated when a pointerUp event occurs close in time (< 300ms) and space (< 10 pixels) to the corresponding pointerDown event. Then first the pointerTap event is sent before the pointerUp.

Calling this method with the same arguments removes the previous listener before adding the new one. This semantics ensures that dynamically-modified method will be used.

### `removeEventListener(eventName:EventName, listener:function|string)`
`type EventName = "pointerDown"|"pointerUp"|pointerMove"|"pointerTap"|"pointerLeave"|"pointerEnter"|"wheel"|"doubleDown"|"click"|"keyUp"|"keyDown"`

This method removes the event listener that was added. You can call it when there is no matching event listener.

### `subscribe(scope:string, eventName:string, listener:function|string)`

This method adds a Croquet event subscription. Unlike the version in the Croquet Library, this version removes the subscription with the same `scope` and `eventName` if it exists before adding the new one. This semantics ensures that it is safe to call this from the `setup()` of a behavior.

### `publish(scope:string, eventName:string, data:any)`

This method publishes a Croquet event.

### `listen(eventName:string, listener:function|string)`

This method add a Croquet event subscription by calling the `subscribe()` method with `this.id` as the `scope`.

### `say(eventName:string, data:any)`

This method publishes a Croquet event with `this.id` as its `scope`.

### `sayDeck(message:string, data:any)`

This method publishes a Croquet event in the scope of `this._parent.id` if `this._parent` is not undefined, or in `this.id` if it is undefined. Note that `this.parent` is resolved dynamically at the call time.

### `listenDeck(message:string, listener:function|string)`

This method subscribes a Croquet event in the scope of `this._parent.id` if `this._parent` is not undefined, or in `this.id` if it is undefined. Note that `this.parent` is resolved at the first time it is called, and any change to `this._parent` will not update the subscription.

### `addLayer(newLayerName:string)`

This method adds a new element to the `layers` array. If `newLayerName` is already in the `layers` array, the call does not have any effects.

### `removeLayer(layerName:string)`

This method removes an element from the `layers` array. If `layerName` is not in the `layers` array, the call does not have any effects.

### `translateTo(v:Vector3)`
`type Vector3 = Array<number, number, number>`

This method moves the translation of the card to the specified `[x, y, z]` coordinates.

### `rotateTo(q:Quotanion)`
`type Quotanion = Array<number, number, number, number>`

This method sets the translation of the card to the specified by a quaternion (`[x, y, z, w]`).

### `scaleTo(s:Vector3)`
`type Vector3 = Array<number, number, number, number>`

This method sets the scale of the card to the specified by scale factors in [x, y, z] axis.

### `positionTo(v:Vector3, q:Quaternion)`
```TypeScript```
type Vector3 = Array<number, number, number, number>
type Quotanion = Array<number, number, number, number>
```

This method sets the translation and rotation of the card, making sure that those two values are used in the same logical time and used for the rendering.

### `nop()`

This method is empty. It is used to have a way to get the tap to focus keyboard events but you don't need to take any particular action on tap.

## CardPawn Properties

The corresponding actor for a CardPawn is accessible by `this.actor`. You can read a value in `_cardData` simply by `this.actor._cardData.prop`. But note that a pawn should never modify the state of the actor.

The most important property of CardPawn is `shape`, which is a Three.JS `Group`, and the Micorverse system treats it as the primary visual representation of the card. Customizing the visual appearance of a card means to create a new Three.JS Object3D and add it to `shape`.

When the Card's type is "2d", and it has some `textureType`, the texture object is stored in `this.texture`.  If the `textureType is "canvas", the DOM canvas is stored in `this.canvas` so a pawn behavior can paint into the canvas.

## CardPawn Methods

### `call(behaviorName:string, methodName:string, ...values:Array<any>):any`

This method invokes a method of another behavior. The `behaviorName` has to be in one of the form of:

* "*ModuleName*$*BehaviorName*"
* "*BehaviorName*"

When the first form is used, it specifies the globally known module name and the behavior with the name on the actor side of the module.  When the second form is used, it specified the behavior in the same module as the calling behavior.

The `methodName` is the name of the method, and `values` are variable-length arguments for the method.

### `actorCall(behaviorName:string, methodName:string, ...values:Array<any>):any`

This method invokes a method on the corresponding actor. It is expected that the method to be invoked does not alter the state of the actor, but only reads a property or synthesizes a value from properties.

The `behaviorName` has to be a name of an actor behavior in the same module.

`actorCall()` is used as you cannot invoke an intended method by a simple invocation syntax:

```JavaScript
let foo = aPawn.actor.getFoo();
```

because the behavior that has `getFoo()` is not specified. If `getFoo()` is defined by an actor behavior with the name `FooActor`, you can call it by

```JavaScript
let foo = aPawn.actorCall("FooActor", "getFoo");
```

### `future(time:number)`

This method schedules a future call in roughly the specified wall time in milliseconds. If it is used in this form:

```JavaScript
this.future(20).mth();
```

`mth` of the same behavior will be invoked. If you would like to call a method of another module or behavior, you can use `call()`:

```JavaScript
this.future(20).call("Module$Behavior", "mth");
```

### `addEventListener(eventName:EventName, listener:function|string)`
`type EventName = "pointerDown"|"pointerUp"|pointerMove"|"pointerTap"|"pointerLeave"|"pointerEnter"|"wheel"|"doubleDown"|"click"|"keyUp"|"keyDown"`

This method adds a "listener" to be invoked when an event occurs on the pawn of a card. When `listener` is a string, it has to have the name of an existing method of CardPawn or the behavior itself. (Internally the function object is stored in the event listener data structure.)

Calling this with the same arguments (thus the string form) removes the previous listener and then add the new one. This semantics ensures that dynamically-modified method will be used.

### `removeEventListener(eventName:EventName, listener:function|string)`
`type EventName = "pointerDown"|"pointerUp"|pointerMove"|"pointerTap"|"pointerLeave"|"pointerEnter"|"wheel"|"doubleDown"|"click"|"keyUp"|"keyDown"`

This method removes the event listener that was added. You can call it even when there is no matching event listener.

### `subscribe(scope:string, eventName:string, listener:function|string)`

This method adds Croquet event subscription. Unlike the version in the Croquet Library, this version removes the subscription with the same `scope` and `eventName` if it exists before adding a new one; so that it is safe to call this from the `setup()` of a behavior.

The `listener` can be either a function or a string in the form of:

* "`*ModuleName*$*BehaviorName*.*methodName*"`
* `"*BehaviorName*.*methodName*"`
* `"*methodName*"`

### `publish(scope:string, eventName:string, data:any)`

This method publishes a Croquet event.

### `listen(eventName:string, listener:function|string)`

This method add a Croquet event subscription by calling the `subscribe()` method with `this.actor.id` as the `scope`.

### `say(eventName:string, data:any)`

This method publishes a Croquet event with `this.actor.id` as its `scope`.

### `sayDeck(message:string, data:any)`

This method publishes a Croquet event in the scope of `this.actor._parent.id` if `this.actor._parent` is not undefined, or in `this.actor.id` if it is undefined. Note that `this.actor.parent` is resolved dynamically at the call time.

### `listenDeck(message:string, listener:function|string)`

This method subscribes a Croquet event in the scope of `this.actor._parent.id` if `this.actor._parent` is not undefined, or in `this.actor.id` if it is undefined. Note that `this.parent` is resolved at the first time it is called, and any change to `this.actor._parent` will not update the subscription.


### `addUpdateRequest(array:Array<behaviorName, methodName>)`

A pawn behavior may request a method callback when CardPawn's `update()` method is invoked. behaviorName and methodName will be "registered in the pawn, and for each `update()` call, the behavior method is invoked.

### `roundedCornerGeometry(width:number, height:number, depth:number, cornerRadius:number):Geometry`

This method creates a flat card like Three.JS geometry in specified in `width`, `height`, `depth`, and `cornerRadius`.

### `makePlaneMaterial(depth:number, color:number, frameColor:number, fullBright:boolean):Material|Array<Material>`

This method creates a Three.JS material that can be used with the geometry created by `roundedCornerGeometry()`. When the depth is non-zero, thus it is expected that the geometry from `roundedCornerGeometry()` has "sides", this method returns an array of materials with `color` and `frameColor`. Otherwise, it return a material with `color`.

### `translateTo(v:Vector3)`
`type Vector3 = Array<number, number, number`

This method publishes an event to set the corresponding actor's translation.

### `rotateTo(q:Quaternion)`
`type Quaternion = Array<number, number, number, number>`

This method publishes an event to set the corresponding actors's rotation.

### `scaleTo(s:Vector3)`
`type Vector3 = Array<number, number, number>`

This method publishes an event to set the corresponding actors's rotation.

### `positionTo(v:Vector3, q:Quaternion)`
```TypeScript```
type Vector3 = Array<number, number, number>
type Quaternion = Array<number, number, number, number>
```

This method publishes an event to set the corresponding actors's translation and rotation. It guarantees that two values are sent in one message, thus causes both to be updated at the same time.

### `constructCollider(obj:Object3D)`

In order for the avatar to walk on a three-dimensional model, the 3D model needs to have the bounded volume hierarchy structure attached. This method has to be called to make a 3D object that is created in the pawn-side behavior.

### `cleanupColliderObject()`

If the card has an associated collider object, it will be removed. If there is no collider object, this method does not take any effects.

A typical use case of `constructCollider()` and `cleanupColliderObject()` in a pawn-side behavior is as follows in its `setup()` method:

```JavaScript
	this.cleanupColliderObject()
        if (this.actor.layers && this.actor.layers.includes("walk")) {
            this.constructCollider(this.floor);
            // where this.floor is a Three.js Mesh with geometry.
        }
```

### `nop()`

This method is empty. It is used to have a way to get the tap to focus keyboard events but you don't need to take any particular action on tap.

