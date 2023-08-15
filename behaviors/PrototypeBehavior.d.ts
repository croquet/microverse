export type Quaternion = import("../src/types").Quaternion;
export type Vector3 = import("../src/types").Vector3;
export type Vector2 = import("../src/types").Vector2;
export type MicroverseModule = import("../src/types").MicroverseModule;

export type BehaviorMethod = Array<string>;
export type PlaneMaterial = THREE.MeshStandardMaterial|Array<THREE.Material>;
export type Rotation = Quaternion|Vector3;

export type CardActor = ActorBehavior;
export type CardPawn = PawnBehavior;
export type AvatarActor = ActorBehavior & AvatarActorPart;
export type AvatarPawn = PawnBehavior & AvatarPawnPart;
export type P3DEvent = {
   targetId: string, avatarId: string,
   xyz: Vector3, uv: Vector2,
   normal: Vector3, distance: number,
   ctrlKey: boolean, altKey: boolean, shiftKey: boolean, metaKey: boolean,
   xy: Vector2, id: number,
   button: number, buttons, number, instanceId: number,
   ray: {origin: Vector3, direction: Vector3},
   deltaY: number
}

declare global {
    var Microverse: MicroverseModule
}

export class ActorBehavior {
    /**
The id of the CardActor.

        @public
        @type string
    */
    get id(): string

    /**
The id of the session.

        @public
        @type string
    */
    get sessionId(): string

    /**
The [x, y, z] translation of the card.

        @public
        @type Vector3
    */
    get translation(): Vector3

    /**
The rotation of the card in quaternion.
       @public
       @type Quaternion
    */
    get rotation(): Quaternion

    /**
The scale of the card in three axes.
       @public
       @type Vector3
    */
    get scale(): Vector3

    /**
       The layers property specifies how the card is treated when a special action is taken. Typical value are as follows:

- "walk": The avatar stays on the geometry of the card.
- "pointer": The pointer action is enabled.
- "portal": the avatar tests if the card it is going through needs to take the avatar to a connected world.

       @public
       @type Array

    */
    get layers(): Array<string>

    /**
       The cards in the world are organized in a hierarchical parent-children structure. The `parent` specifies its parent. Note that this is a "logical" structure. All cards are held as a direct child of the Three.JS scene, with automatic matrix composition for nested cards.

       @public
       @type CardActor
    */
    get parent(): CardActor

    /**
       The list of behavior modules installed to the card.

       @public
       @type Array

    */
    get behaviorModules(): Array<string>

    /**
       An informative string for the card.

       @public
       @type string
    */
    get name(): string

    /**
       The visibility of the card, and whether it responds to pointer events or not.

       @public
       @type boolean
    */

    get hidden(): boolean|undefined

    /**
       Any other values that the CardActor holds are stored in an object stored in the `_cardData` property. This is needed to mark the values to be stored in the persistent data.

       @public
       @type Object
    */
    get _cardData(): any

    /**
       This method creates a new card (a CardActor on the model side and a CardPawn on the view side), based on the `cardSpec`.

       @public
       @param {object} data - the spec for a card to be created.
       @returns {CardActor} the CardActor created.
    */
    createCard(data:any): CardActor

    /**
       This method removes the card from the world. All `teardown()` method of installed pawn behaviors and actor behaviors are called before the CardActor is removed from the system.

       @public
    */
    destroy(): void

    /**
       This method invokes a method of another behavior. The `behaviorName` has to be in one of the form of:

- "*ModuleName*$*BehaviorName*"
- "*BehaviorName*"

When the first form is used, it specifies the globally known module name and the behavior with the name on the actor side of the module.  When the second form is used, it specified the behavior in the same module as the calling behavior.

       * The `methodName` is the name of the method, and `values` are variable-length arguments for the method.

       @public
       @param {string} behaviorName - name of the behavior
       @param {string} methodName - name of the method
       @param {any} ...arguments - arguments for the method
       @returns {any} the return value from the method
    */
    call(behaviorName: string, methodName: string, ...args:Array<any>): any

    /**
       This method schedules a future call in the specified logical time in milliseconds. If it is used in this form:

`this.future(20).mth();`

`mth` of the same behavior will be invoked 20 milliseconds from logical `now`. If you would like to call a method of another module or behavior, you can use `call()`:

`this.future(20).call("Module$Behavior", "mth");`

       @public
       @param {number} time - the delay in logical millisecond
       @returns A proxy to invoke a method on
    */
    future(time: number): ThisType

    /**
       This method updates some elements in the `_cardData` object. The current value and the new values are merged to create the new `_cardData` object. As a side effect, it publishes `cardDataSet` Croquet event that can be handled by the pawn or any other subscribers.

       @public
       @param {object} options - keys and values to specify new values

    */
    setCardData(options:any): void

    /**
This method adds a "listener" to be invoked when an event occurs on the card.  When `listener` is a function, it has to have a form of `this.mthName` where `mthName` is an existing method name of CardActor or the behavior itself. When listener is a string, it has to be the name of a method at CardActor or the behavior itself. The listener added by this Actor-side `addEventListener()` is invoked when any user in the world causes the corresponding user pointer or key event.

Calling this method with the same arguments removes the previous listener before adding the new one. This semantics ensures that dynamically-modified method will be used.

       @public
       @param {EventName} eventType - the event type
       @param {string|function} listener - the name of the handler in the calling behavior, or a function specified in the form of `this.mth`
    */
    addEventListener(eventName: string, listener: string|((evt: P3DEvent) => void)): void

    /**
This method removes the event listener that was added. You can call it when there is no matching event listener.

       @public
       @param {EventType} eventName - the event type
       @param {string|function} listener
    */
    removeEventListener(eventName: string, listener: string|((evt: P3DEvent) => void)): void

    /**
       This method adds a Croquet event subscription. Unlike the version in the Croquet Library, this version removes the subscription with the same `scope` and `eventName` if it exists before adding the new one. This semantics ensures that it is safe to call this from the `setup()` of a behavior.

       @public
       @param {string} scope - the scope of Croquet event
       @param {string} eventName - the event name of Croquet event
       @param {string|function} listener - the name of the handler in the calling behavior, or a function specified in the form of `this.mth`
    */
    subscribe<T>(scope: string, eventName: string, listener: string|((data: T) => void)): void

    /**
       This method publishes a Croquet event.

       @public
       @param {string} scope - the scope of Croquet event
       @param {string} eventName - the event name of Croquet event
       @param {any} data - serializable data to be published
    */
    publish<T>(scope: string, eventName: string, data: T): void

    /**
       This method adds a Croquet event subscription by calling the `subscribe()` method with `this.id` as the `scope`.

       @public
       @param {string} eventName - the event name of Croquet event
       @param {string|function} listener - the name of the handler in the calling behavior, or a function specified in the form of `this.mth`
    */
    listen<T>(eventName: string, listener: string|((arg: T) => void)): void

    /**
       This method publishes a Croquet event with `this.id` as the `scope`. It is usually used to publish an event whose expect recipient is the corresponding CardPawn.

       @public
       @param {string} eventName - the event name of Croquet event
       @param {any} data - serializable data to be published
    */
    say<T>(eventName: string, data?: T): void

    /**
       This method adds a new element to the `layers` array. If `newLayerName` is already in the `layers` array, the call does not have any effects.

       @public
       @param {string} newLayerName - the name of a later to be added
    */
    addLayer(newLayerName: string): void

    /**
       This method removes an element from the `layers` array. If `layerName` is not in the `layers` array, the call does not have any effects.

       @public
       @param {string} layerName - the name of a later to be removed
    */
    removeLayer(layerName: string): void

    /**
This method moves the translation of the card to the specified `[x, y, z]` coordinates.
       @public
       @param {Vector3} v - the translation for the card
    */
    translateTo(v: Vector3): void

    /**
When rot is a 4 element array, it is interpreted as a quaternion.
When rot is a 3 element array, it is interpreted as an Euler angle.
When rot is a number, it is interpreted as [0, rot, 0].

This method sets the rotation of the card to the specified by the argument.
       @public
       @param {Rotation|number} rot - the rotation for the card
    */
    rotateTo(rot: Rotation|number): void

    /**
When s is a number, it is interpreted as `[s, s, s]`.
This method sets the scale of the card to the specified by scale factors in [x, y, z] axis.

       @public
       @param {Vector3|number} s - the scale for the card
    */
    scaleTo(s: Vector3|number): void

    /**
This method sets the translation and rotation of the card, making sure that those two values are used in the same logical time and used for the rendering.

       @public
       @param {Vector3} v - the translation for the card
       @param {Quaternion} q - the rotation for the card
    */
    positionTo(v: Vector3, q: Quaternion): void


    /**
This method moves the translation of the card by the specified `[x, y, z]` vector.
       @public
       @param {Vector3} v - the translation offset
    */
    translateBy(v: Vector3): void

    /**
When rot is a 4 element array, it is interpreted as a quaternion.
When rot is a 3 element array, it is interpreted as an Euler angle.
When rot is a number, it is interpreted as [0, rot, 0].

This method combines the rotation of the card by the specified rotation.
       @public
       @param {Rotation|number} rot - the additional rotation for the card
    */
    rotateBy(rot: Rotation|number): void

    /**
When s is a number, it is interpreted as [s, s, s].
This method multiplies the scale of the card by the specified by scale factors in [x, y, z] axis.

       @public
       @param {Vector3} s - the scale offset
    */
    scaleBy(s: Vector3): void

    /**
When v is a number, it is interpreted as [0, 0, v].

This method translates the object by `the specified offset, in the reference frame of the object.
       @public
       @param {Vector3|number} v - the offset
    */
    forwardBy(v: Vector3): void

    /**
A Three.js keyframe based animation is supported. The animation clip can contain multiple tracks. The index specified here dictates which track to play. A cardData called animationStartTime specifiy the base for time offset.

@public
@param {number} animationClipIndex - the index into animation tracks array
    */

    setAnimationClipIndex(animationClipIndex: number): void

    /**
       This method is empty. It is used to have a way to get the tap to focus keyboard events but you don't need to take any particular action on tap.

       @public
    */
    nop(): void
}

export class PawnBehavior {
    /**
The id of the CardPawn.

        @public
        @type string
    */
    get id(): string

    /**
The viewId of the session.

        @public
        @type string
    */
    get viewId(): string

    /**
The id of the session.

        @public
        @type string
    */
    get sessionId(): string

    /**
The corresponding actor of this pawn:

        @public
        @type CardActor
    */
    get actor(): CardActor

    /**
       The cards in the world are organized in a hierarchical parent-children structure. The `parent` property specifies its parent. The pawn side implementation here returns a pawn if the card has a parent.

       @public
       @type CardActor
    */
    get parent(): CardPawn
    
    /**
       the shape property is the root of the visual appearance of the card. It is a THREE.Object3D.

       @public
       @type THREE.Object3D
    */
    get shape(): THREE.Object3D
    

    /**
The [x, y, z] translation of the card.

        @public
        @type Vector3
    */
    get translation(): Vector3

    /**
The rotation of the card in quaternion.
       @public
       @type Quaternion
    */
    get rotation(): Quaternion

    /**
The scale of the card in three axes.
       @public
       @type Vector3
    */
    get scale(): Vector3

    /**
       This method invokes a method of another behavior. The `behaviorName` has to be in one of the form of:

- "*ModuleName*$*BehaviorName*"
- "*BehaviorName*"

When the first form is used, it specifies the globally known module name and the behavior with the name on the actor side of the module.  When the second form is used, it specified the behavior in the same module as the calling behavior.

The `methodName` is the name of the method, and `values` are variable-length arguments for the method.

       @public
       @param {string} behaviorName - the name of the behavior that has the metho
       @param {string} methodName - the name of the method
       @param {any} values - arguments for the method
       @returns any
    */
    call(behaviorName: string, methodName: string, ...values: Array<any>): any

    /**
       This method invokes a method on the corresponding actor. It is expected that the method to be invoked does not alter the state of the actor, but only reads a property or synthesizes a value from properties.

       * The `behaviorName` has to be a name of an actor behavior in the same module.

       * `actorCall()` is used as you cannot invoke an intended method by a simple invocation syntax:

`let foo = aPawn.actor.getFoo();`

because the behavior that has `getFoo()` is not specified. If `getFoo()` is defined by an actor behavior with the name `FooActor`, you can call it by

`let foo = aPawn.actorCall("FooActor", "getFoo");`

Make sure that the actor's method called from the pawn does not modify the state of the model in any way.

       @public
       @param {string} behaviorName - the name of the behavior that has the method
       @param {string} methodName- the name of the method
       @param {any} values - arguments for the method
    */

    actorCall(behaviorName: string, methodName: string, ...values: Array<any>): any

    /**
       This method schedules a future call in roughly the specified wall time in milliseconds. If it is used in this form:

`this.future(20).mth();`

mth` of the same behavior will be invoked. If you would like to call a method of another module or behavior, you can use `call()`:

       @example this.future(20).call("Module$Behavior", "mth");

       @public
       @returns a proxy to call a method on
       @param {number} time - the wall clock time to delay the method invocatino.
    */
    future(time: number): ThisType

    /**
This method adds a "listener" to be invoked when an event occurs on the pawn of a card. When `listener` is a string, it has to have the name of an existing method of CardPawn or the behavior itself. (Internally the function object is stored in the event listener data structure.)

Calling this with the same arguments (thus the string form) removes the previous listener and then add the new one. This semantics ensures that dynamically-modified method will be used.

       @public
       @param {EventName} eventName - the event name of Croquet event
       @param {string|function} listener - the name of the handler in the calling behavior, or a function specified in the form of `this.mth`
    */

    addEventListener(eventName: string, listener: string|((evt: P3DEvent) => void)): void

    /**
This method removes the event listener that was added. You can call it even when there is no matching event listener.

       @public
       @param {EventName} eventName - the event name of Croquet event
       @param {string|function} listener - the name of the handler in the calling behavior, or a function specified in the form of `this.mth`
    */

    removeEventListener(eventName: string, listener: string|((evt: P3DEvent) => void)): void

    /**
       This method adds Croquet event subscription. Unlike the version in the Croquet Library, this version removes the subscription with the same `scope` and `eventName` if it exists before adding a new one; so that it is safe to call this from the `setup()` of a behavior.

       * The `listener` can be either a function or a string in the form of:

- "*ModuleName*$*BehaviorName*.*methodName*"
- "*BehaviorName*.*methodName*"
- "*methodName*"

       @public
       @param {string} scope - the scope name of Croquet event
       @param {string} eventName - the event name of Croquet event
       @param {string|function} listener - the name of the handler in the calling behavior, or a function specified in the form of `this.mth`
       */

    subscribe<T>(scope: string, eventName: string, listener: string|((evt: T) => void)): void

    /**
       This method publishes a Croquet event.

       @public
       @param {string} scope - the scope of Croquet event
       @param {string} eventName - the eventName of Croquet event
       @param {anyf} data - serializable data to be published
    */

    publish<T>(scope: string, eventName: string, data?: T): void

    /**
       This method add a Croquet event subscription by calling the `subscribe()` method with `this.actor.id` as the `scope`.

       @public
       @param {string} eventName - the eventName of Croquet event
       @param {string|function} listener - the name of the handler in the calling behavior, or a function specified in the form of `this.mth`
    */

    listen<T>(eventName: string, listener: string|((evt: T) => void)): void

    /**
       This method publishes a Croquet event with `this.actor.id` as its `scope`.

       @public
       @param {string} eventName - the eventName of Croquet event
       @param {any} data - serializable data to be published
    */

    say<T>(eventName: string, data?: T): void

    /**
       This method returns the AvatarPawn of the local client. Recall that the notion of "my" avatar only exists on the view side. The model side treats all avatars equally, even the one that is associated with the local computer. This is why this method is on the pawn side, and returns the AvatarPawn.

       @public
       @returns {AvatarPawn} The local AvatarPawn
    */

    getMyAvatar(): AvatarPawn

    /**
       A pawn behavior may request a method callback when CardPawn's `update()` method is invoked. behaviorName and methodName will be "registered in the pawn, and for each `update()` call, the behavior method is invoked.

       *the argument is an array of the behavior name and the method to be called: `type BehaviorMethod = Array<behaviorName, methodName>`.

       @public
       @param {BehaviorMethod} array - a two element array with behavior name and method name
    */

    addUpdateRequest(array: BehaviorMethod): void

    /**
       This method creates a flat card like Three.JS geometry in specified in `width`, `height`, `depth`, and `cornerRadius`.

       @public
       @param {number} width - width of the geometry (in meters)
       @param {number} height - height of the geometry (in meters)
       @param {number} depth - depth of the geometry (in meters)
       @param {number} cornerRadius - radius of the corners of the geometry (in meters)
       @returns {Geometry} THREE.Geometry created
    */

    roundedCornerGeometry(width: number, height: number, depth: number, cornerRadius: number): THREE.BufferGeometry

    /**
`type PlaneMaterial = Material|Array<Material>`

This method creates a Three.JS material that can be used with the geometry created by `roundedCornerGeometry()`. When the depth is non-zero, thus it is expected that the geometry from `roundedCornerGeometry()` has "sides", this method returns an array of materials with `color` and `frameColor`. Otherwise, it return a material with `color`.

       @public
       @param {number} depth - depth of the geometry (in meters)
       @param {number} color - the surface color for the material
       @param {number} frameColor - the frame color for the material if depth is non-zero
       @param {boolean} fullBright - if the material should ignore shaadows.
       @returns {PlaneMaterial}
    */

    makePlaneMaterial(depth: number, color: number, frameColor: number, fullBright: boolean): PlaneMaterial

    /**
This method publishes an event to set the corresponding actor's translation.

       @public
       @param {Vector3} v - the translation to be used by corresponding actor
    */

    translateTo(v: Vector3): void

    /**
This method publishes an event to set the corresponding actors's rotation.

       @public
       @param {Quaternion} q - the rotation to be ued by corresponding actor
    */

    rotateTo(q: Quaternion): void

    /**
This method publishes an event to set the corresponding actors's rotation.

       @public
       @param {Vector3} s the scale to be used by the corresponding actor
    */

    scaleTo(s: Vector3): void

    /**
This method publishes an event to set the corresponding actors's translation and rotation. It guarantees that two values are sent in one message, thus causes both to be updated at the same time.

       @public
       @param {Vector3} v  - the translation to be used by corresponding actor
       @param {Quaternion} q - the rotation to be ued by corresponding actor
    */

    positionTo(v: Vector3, q: Quaternion): void

    /**
       In order for the avatar to walk on a three-dimensional model, the 3D model needs to have the bounded volume hierarchy structure attached. This method has to be called to make a 3D object that is created in the pawn-side behavior.

       @public
       @param {Object3D} obj
    */

    constructCollider(obj: THREE.Object3D): void

    /**
       If the card has an associated collider object, it will be removed. If there is no collider object, this method does not take any effects.

       * A typical use case of `constructCollider()` and `cleanupColliderObject()` in a pawn-side behavior is as follows in its `setup()` method:

       @public
       @example
this.cleanupColliderObject()
if (this.actor.layers && this.actor.layers.includes("walk")) {
    this.constructCollider(this.floor);
    // where this.floor is a Three.js Mesh with geometry.
 }
    */

    cleanupColliderObject(): void

    /**
       This method is empty. It is used to have a way to get the tap to focus keyboard events but you don't need to take any particular action on tap.

       @public
    */

    nop(): void
}


class AvatarActorPart {
    /**
The avatar's camera rotation around the X axis (the axis going from left to right; thus a positive value indicates to look "up", and a negative value indicates to look "down".)

To get desired effects, use the set method:

```JavaScript
this.set({lookPitch: n});
```

Typically you would set lookPitch and lookYaw at the same time:

```JavaScript
this.set({lookPitch: m, lookYaw: n});
```
        @public
        @type number
    */
    get lookPitch(): number
    /**
The avatar's camera rotation around the Y axis in the scene (the axis going from bottom to top; thus a positive value indicates to look east, and a negative value indicates to look west.

        @public
        @type number
    */
    get lookYaw(): number

    /**
       The offset in 3D coordinates between avatar's position and the camera's position. A typical third person view behind the avatar has [0, p, p], where p is a positive number.

       While those three variables are used in the default `walkLook()` implementation, you can override the method to have a totally custom camera position. (see below.)

       @public
       @type Vector3
    */

    get lookOffset(): Vector3

    /**
Equivalent to call:

```JavaScript
this.goTo([0, 0, 0], [0, 0, 0, 1])
```

and

```JavaScript
        this.set({lookPitch: 0, lookYaw: 0});
```

as well as to notify the pawn by:

```JavaScript
        this.say("setLookAngles", {pitch: 0, yaw: 0, lookOffset: [0, 0, 0]});
```
      @public
     */

      goHome()
}

class AvatarPawnPart {
    
    /** 
	Sets the coressponding actor's look configurations by publishing an event to the actor.
	@public
	@param {number} pitch
	@param {number} yaw
	@param {Vector3} lookOffset
    */
    lookTo(pitch:number, yaw:number, lookOffset:Vector3)

    /** 
	This method sets the opacity of the 3D model by assigning a different opacity value into the Three.js material.

	@public
	@param {number} opacity
    */
    setOpacity(opacity:number)

    /**
       This call initiates tells the actor to move back to [0, 0, 0], and resets rotation.
    */

    goHome()
}
