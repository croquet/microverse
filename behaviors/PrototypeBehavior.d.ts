export type Quaternion = [number, number, number, number];
export type Vector3 = [number, number, number];
export type Vector2 = [number, number];
export type Matrix2 = [number, number, number, number];
export type Matrix3 = [number, number, number, number, number, number, number, number, number];

export type EventName = "pointerDown"|"pointerUp"|"pointerMove"|"pointerTap"|"pointerLeave"|"pointerEnter"|"pointerWheel"|"pointerDoubleDown"|"click"|"keyUp"|"keyDown";

export type EventMask = {altKey?: boolean, shiftKey?: boolean, ctrlKey?: boolean, metaKey?: boolean};

export type VQ = {v: Vector3, q: Quaternion};

export type Matrix4 = [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number
];

export type WorldcoreExports = {
    slerp(a: number, b: number, t: number): number,

    /**
     * Null 2-vector [0, 0]
     * @public
     * @returns {Vector2}
     */
    v2_zero(): Vector2,
    /**
     * Random point on a unit circle.
     * @public
     * @returns {Vector2}
     */
    v2_random(): Vector2,

    /**
     * Magnitude of vector.
     * @public
     * @param {Vector2} v
     * @returns {number}
     */
    v2_magnitude(v: Vector2): number,

    /**
     * Squared magnitude of vector.
     * @public
     * @param {Vector2} v
     * @returns {number}
     */
    v2_sqrMag(v: Vector2): number,

    /**
     * Normalized vector. (Error on magnitude 0)
     * @public
     * @param {Vector2} v
     * @returns {number[]}
     */
    v2_normalize(v: Vector2): Vector2,

    /**
     * Absolute value of all elements.
     * @public
     * @param {Vector2} v
     * @returns {Vector2}
     */
    v2_abs(v: Vector2): Vector2,

    /**
     * Ceiling of all elements.
     * @public
     * @param {Vector2} v
     * @returns {Vector2}
     */
    v2_ceil(v: Vector2): Vector2,

    /**
     * Floor of all elements.
     * @public
     * @param {Vector2} v
     * @returns {Vector2}
     */
    v2_floor(v: Vector2): Vector2,

    /**
     * Reciprocal of all elements.
     * @public
     * @param {Vector2} v
     * @returns {Vector2}
     */
    v2_inverse(v: Vector2): Vector2,

    /**
     * Multiply all elements by a constant scale factor.
     * @public
     * @param {Vector2} v
     * @param {number} s
     * @returns {Vector2}
     */
    v2_scale(v: Vector2, s: number): Vector2,

    /**
     * Multiply individual elements of two vectors
     * @public
     * @param {Vector2} a
     * @param {Vector2} b
     * @returns {Vector2}
     */
    v2_multiply(a: Vector2, b: Vector2),

    /**
     * Divide individual elements of two vectors
     * @public
     * @param {Vector2} a
     * @param {Vector2} b
     * @returns {Vector2}
     */
    v2_divide(a: Vector2, b: Vector2);

    /**
     * Rotate clockwise. Angle in radians.
     * @public
     * @param {Vector2} v
     * @param {number} a
     * @returns {Vector2}
     */
    v2_rotate(v: Vector2, a: number): Vector2,

    /**
     * Add two vectors
     * @public
     * @param {Vector2} a
     * @param {Vector2} b
     * @returns {Vector2}
     */
    v2_add(a: Vector2, b: Vector2): Vector2,

    /**
     * Subtract two vectors
     * @public
     * @param {Vector2} a
     * @param {Vector2} b
     * @returns {Vector2}
     */
    v2_sub(a: Vector2, b: Vector2): Vector2,

    /**
     * Dot product of two vectors
     * @public
     * @param {Vector2} a
     * @param {Vector2} b
     * @returns {number}
     */
    v2_dot(a: Vector2, b: Vector2): number,

    /**
     * Minimum of two vectors, compared element by element.
     * @public
     * @param {Vector2} a
     * @param {Vector2} b
     * @returns {Vector2}
     */
    v2_min(a: Vector2, b: Vector2): Vector2,

    /**
     * Maximum of two vectors, compared element by element.
     * @public
     * @param {Vector2} a
     * @param {Vector2} b
     * @returns {Vector2}
     */
    v2_max(a: Vector2, b: Vector2): Vector2,

    /**
     * Angle in radian between two vectors.
     * @public
     * @param {Vector2} a
     * @param {Vector2} b
     * @returns {number}
     */
    v2_angle(a: Vector2, b: Vector2): number,

    v2_signedAngle(a: Vector2, b: Vector2): number,

    /**
     * Linear interpolation between two vectors
     * @public
     * @param {Vector2} a
     * @param {Vector2} b
     * @param {number} t - interpolation value between 0 and 1
     * @returns {Vector2}
     */
    v2_lerp(a: Vector2, b: Vector2, t: number): Vector2,

    /**
     * Checks for vector equality within an epsilon.
     * @public
     * @param {Vector2} a
     * @param {Vector2} b
     * @param {number} e - epsilon 0 by default
     * @returns {boolean}
     */
    v2_equals(a: Vector2, b: Vector2, e?: number): boolean,

    /**
     * Checks if vector is [0, 0]
     * @public
     * @param {Vector2} v
     * @returns {boolean}
     */
    v2_isZero(v: Vector2): boolean,

    v2_distance(a: Vector2, b: Vector2): number,
    v2_distanceSqr(a: Vector2, b: Vector2): number,

    /**
     * Manhattan distance of vector
     * @public
     * @param {Vector2} v
     * @returns {number}
     */
    v2_manhattan(a: Vector2, b: Vector2): number,

    /**
     * Multiplies vector by a 2x2 matrix
     * @public
     * @param {Vector2} v
     * @param {Matrix2} m
     * @returns {Vector2}
     */
    v2_transform(v: Vector2, m: Matrix2): Vector2,
    v2_perpendicular(v: Vector2) : Vector2,
    v2_closest(v: Vector2, p: Vector2): Vector2,

    /**
     * Null 3-vector [0, 0, 0]
     * @public
     * @returns {Vector3}
     */
    v3_zero(): Vector3,

    /**
     * Random point on a unit sphere.
     * @public
     * @returns {Vector3}
     */
    v3_random(): Vector3,

    /**
     * Magnitude of vector.
     * @public
     * @param {Vector3} v
     * @returns {number}
     */
    v3_magnitude(v: Vector3): number,

    /**
     * Squared magnitude of vector.
     * @public
     * @param {Vector3} v
     * @returns {number}
     */
    v3_sqrMag(v: Vector3): number,

    /**
     * Normalized vector. (Error on magnitude 0)
     * @public
     * @param {Vector3} v
     * @returns {Vector3}
     */
    v3_normalize(v: Vector3): Vector3,

    /**
     * Reciprocal of all elements.
     * @public
     * @param {Vector3} v
     * @returns {Vector3}
     */
    v3_inverse(v: Vector3): Vector3,

    /**
     * Absolute value of all elements.
     * @public
     * @param {Vector3} v
     * @returns {Vector3}
     */
    v3_abs(v: Vector3): Vector3,

    /**
     * Ceiling of all elements.
     * @public
     * @param {Vector3} v
     * @returns {Vector3}
     */
    v3_ceil(v: Vector3): Vector3,

    /**
     * Floor of all elements.
     * @public
     * @param {Vector3} v
     * @returns {Vector3}
     */
    v3_floor(v: Vector3): Vector3,

    /**
     * Multiply all elements by a constant scale factor.
     * @public
     * @param {Vector3} v
     * @param {number} s - scale
     * @returns {Vector3}
     */
    v3_scale(v: Vector3, s: number): number,

    /**
     * Multiply individual elements of two vectors
     * @public
     * @param {Vector3} a
     * @param {Vector3} b
     * @returns {Vector3}
     */
    v3_multiply(a: Vector3, b: Vector3): Vector3,

    /**
     * Divide individual elements of two vectors
     * @public
     * @param {Vector3} a
     * @param {Vector3} b
     * @returns {Vector3}
     */
    v3_divide(a: Vector3, b: Vector3): Vector3,

    /**
     * Rotate around x axis. Angle in radians. Clockwise looking along axis
     * @public
     * @param {Vector3} v
     * @param {number} a
     * @returns {Vector3}
     */
    v3_rotateX(v: Vector3, a: number): Vector3,

    /**
     * Rotate around y axis. Angle in radians. Clockwise looking along axis
     * @public
     * @param {Vector3} v
     * @param {number} a
     * @returns {Vector3}
     */
    v3_rotateY(v: Vector3, a: number): Vector3,

    /**
     * Rotate around z axis. Angle in radians. Clockwise looking along axis
     * @public
     * @param {Vector3} v
     * @param {number} a
     * @returns {Vector3}
     */
    v3_rotateZ(v: Vector3, a: number): Vector3,

    /**
     * Add two vectors
     * @public
     * @param {Vector3} a
     * @param {Vector3} b
     * @returns {Vector3}
     */
    v3_add(a: Vector3, b: Vector3): Vector3,

    /**
     * Subtract two vectors
     * @public
     * @param {Vector3} a
     * @param {Vector3} b
     * @returns {Vector3}
     */
    v3_sub(a: Vector3, b: Vector3): Vector3,

    /**
     * Dot product of two vectors
     * @public
     * @param {Vector3} a
     * @param {Vector3} b
     * @returns {number}
     */
    v3_dot(a: Vector3, b: Vector3): number,

    /**
     * Cross product of two vectors
     * @public
     * @param {Vector3} a
     * @param {Vector3} b
     * @returns {number}
     */
    v3_cross(a: Vector3, b: Vector3): Vector3,

    /**
     * Minimum of two vectors, compared element by element.
     * @public
     * @param {Vector3} a
     * @param {Vector3} b
     * @returns {number}
     */
    v3_min(a: Vector3, b: Vector3): Vector3,

    /**
     * Maximum of two vectors, compared element by element.
     * @public
     * @param {Vector3} a
     * @param {Vector3} b
     * @returns {Vector3}
     */
    v3_max(a: Vector3, b: Vector3): Vector3,

    /**
     * Manhattan distance of vector
     * @public
     * @param {Vector3} a
     * @param {Vector3} b
     * @returns {number}
     */
    v3_manhattan(a: Vector3, b: Vector3): number,

     /**
      * Angle in radian between two vectors.
      * @public
      * @param {Vector3} a
      * @param {Vector3} b
      * @returns {number}
      */
    v3_angle(a: Vector3, b: Vector3): number,

    /**
     * Linear interpolation between two vectors
     * @public
     * @param {Vector3} a
     * @param {Vector3} b
     * @param {number} t - value between 0 and 1
     * @returns {Vector3}
     */
    v3_lerp(a: Vector3, b: Vector3, t: number): Vector3,

    /**
     * Multiplies vector by a 4x4 matrix (Treats the vector as [x,y,z,1] in homogenous coordinates)
     * @public
     * @param {Vector3} a
     * @param {Matrix4} m
     * @returns {Vector3}
     */
    v3_transform(a: Vector3, m: Matrix4): Vector3,

    /**
     * Rotate by a quaternion
     * @public
     * @param {Vector3} v
     * @param {Quaternion} q
     * @returns {Vector3}
     */
    v3_rotate(v: Vector3, q: Quaternion): Vector3,

    /**
     * Checks for vector equality within an epsilon.
     * @public
     * @param {Vector3} a
     * @param {Vector3} b
     * @param {number=} e - epsilon defaults to zero
     * @returns {boolean}
     */
    v3_equals(a: Vector3, b: Vector3, e?: number): boolean,

    /**
     * Checks if vector is [0, 0, 0]
     * @public
     * @param {Vector3} v
     * @returns {boolean}
     */
    v3_isZero(v: Vector3): boolean,

    v3_distance(a: Vector3, b: Vector3): number,
    v3_distanceSqr(a: Vector3, b: Vector3): number,

    /**
     * Returns a 2x2 zero Matrix
     * @public
     * @returns {Matrix2} 2x2 Matrix
     */
    m2_zero(): Matrix2

    /**
     * Returns a 2x2 identity matrix
     * @public
     * @returns {Matrix2} 2x2 Matrix
     */
    m2_identity(): Matrix2,

    /**
     * Returns a 2x2 matrix that will rotate a 2-vector clockwise. Angle is in radians.
     * @public
     * @param {number} angle
     * @returns {Matrix2} 2x2 Matrix
     */
    m2_rotation(angle: number): Matrix2,

    /**
     * Returns a 4x4 zero matrix
     * @public
     * @returns {Matrix4} 4x4 Matrix
     */
    m4_zero(): Matrix4,

    /**
     * Returns a 4x4 identity matrix
     * @public
     * @returns {Matrix4} 4x4 Matrix
     */
    m4_identity(): Matrix4

    /**
     * Creates a 4x4 transform matrix from a 3-vector translation.
     * @public
     * @param {Vector3} v
     * @returns {Matrix4} 4x4 Matrix
     */
    m4_translation(v: Vector3): Matrix4,

    /**
     * Extracts the translation from a 4x4 transform matrix.
     * @public
     * @param {Matrix4} m
     * @returns {Vector3} extracted translation
     */
    m4_getTranslation(m: Matrix4): Vector3,

    /**
     * Creates a 4x4 transform matrix from a 3-vector scale, or a scale constant.
     * @public
     * @param {Vector3|number} s
     * @returns {Matrix4} 4x4 Matrix
     */
    m4_scale(s: Vector3|number): Matrix4,

    /**
     * Extracts the scale from a 4x4 transform matrix.
     * @public
     * @param {Matrix4} m
     * @returns {Vector3} extracted scale
     */
    m4_getScale(m: Matrix4): Vector3,

    /**
     * Creates a 4x4 rotation matrix around the given axis. Angle is in radians, and rotation is clockwise looking along axis.
     * @public
     * @param {Vector3} axis
     * @param {number} angle
     * @returns {Matrix4} 4x4 Matrix
     */
    m4_rotation(axis: Vector3, angle: number): Matrix4,

    /**
     * Creates a 4x4 rotation matrix around the x axis. Angle is in radians, and rotation is clockwise looking along axis.
     * @public
     * @param {number} angle
     * @returns {Matrix4} 4x4 Matrix
     */
    m4_rotationX(a: number): Matrix4,

    /**
     * Creates a 4x4 rotation matrix around the y axis. Angle is in radians, and rotation is clockwise looking along axis.
     * @public
     * @param {number} angle
     * @returns {Matrix4} 4x4 Matrix
     */
    m4_rotationY(a: number): Matrix4,

    /**
     * Creates a 4x4 rotation matrix around the z axis. Angle is in radians, and rotation is clockwise looking along axis.
     * @public
     * @param {number} angle
     * @returns {Matrix4} 4x4 Matrix
     */
    m4_rotationZ(a: number): Matrix4,

    /**
     * Creates a 4x4 rotation matrix from a quaternion.
     * @public
     * @param {Quaternion} rotation
     * @returns {Matrix4} 4x4 Matrix
     */
    m4_rotationQ(q: Quaternion): Matrix4,

    /**
     * Extracts the rotation quaternion from a 4x4 transform matrix.
     * @public
     * @param {Matrix4} matrix
     * @returns {Quaternion} Quaternion
     */
    m4_getRotation(m: Matrix4): Quaternion,

    /**
     * Creates a 4x4 transform matrix from a scale, a rotation, and a translation. The scale can be either a 3-vector or a scalar. The rotation is a quaternion.
     * @public
     * @param {Vector3|number} scale
     * @param {Quaternion} rotation
     * @param {Vector3} translation
     * @returns {Matrix4} 4x4 Matrix
     */
    m4_scaleRotationTranslation(s: Vector3|number, q: Quaternion, v: Vector3) : Matrix4,
    m4_getScaleRotationTranslation(m: Matrix4): [Vector3, Quaternion, Vector3],

    /**
     * Creates a 4x4 perspective matrix from a field of view, an aspect ratio, and the near and far clip planes. The FOV is in radians.
     * @public
     * @param {number} fov
     * @param {number} aspect
     * @param {number} near
     * @param {number} far
     * @returns {Matrix4} 4x4 Matrix
     */
    m4_perspective(fov: number, aspect: number, near: number, far: number): Matrix4,

    /**
     * Returns the transpose of a 4x4 matrix
     * @public
     * @param {Matrix4} m
     * @returns {Matrix4} 4x4 Matrix
     */
    m4_transpose(m: Matrix4): Matrix4,

    /**
     * Returns the determinant of a 4x4 matrix
     * @public
     * @param {Matrix4} matrix
     * @returns {number} Determinant
     */
    m4_determinant(m: Matrix4): number,

    /**
     * Returns the inverse of a 4x4 matrix
     * @public
     * @param {Matrix4} matrix
     * @returns {Matrix4} 4x4 Matrix
     */
    m4_invert(m: Matrix4): Matrix4,

    /**
     * Multiply two 4x4 matrices
     * @public
     * @param {Matrix4} a
     * @param {Matrix4} b
     * @returns {Matrix4} 4x4 Matrix
     */
    m4_multiply(a: Matrix4, b: Matrix4): Matrix4,

    /**
     * Extracts the scaling/rotation components of a 4x4 transform matrix and performs an inverse/transpose operation on them.
     * This is the transform that should be applied to the surface normals of an object in a 3d rendered scene instead of the object's
     * regular 4x4 transform.
     * @public
     * @param {Matrix4} m
     * @returns {number[]} 4x4 Matrix
     */
    m4_toNormal4(m: Matrix4): Matrix4,

    /**
     * Identity quaternion
     * @public
     * @returns {Quaternion}
     */
    q_identity(): Quaternion,
    q_magnitude(q: Quaternion): number,

    /**
     * Normalize quaternion. (If you do a long series of quaternion operations, periodically renormalize to prevent drift.)
     * @public
     * @param {Quaternion} q
     * @returns {Quaternion}
     */
    q_normalize(q: Quaternion): number,

    /**
     * Reverse the rotation.
     * @public
     * @param {Quaternion} q
     * @returns {Quaternion}
     */
    q_conjugate(q: Quaternion): Quaternion,

    /**
     * Reverse the rotation.
     * @public
     * @param {Quaternion} q
     * @returns {Quaternion}
     */
    q_invert(q: Quaternion): Quaternion,

    /**
     * Creates a quaternion for a rotation around an axis. The angle is clockwise in radians looking along the axis. The axis should be normalized.
     * @public
     * @param {Vector3} axis
     * @param {number} angle
     * @returns {Quaternion}
     */
    q_axisAngle(axis: Vector3, angle: number): Quaternion,

    q_toAxisAngle(quat: Quaternion): [Vector3, number],

    /**
     * Given a forward vector, an up vector,  and a target vector, generates a quaternion that will rotate the forward vector to look at the target vector.
     * All vectors should be normalized.
     * @public
     * @param {Vector3} f - forward
     * @param {Vector3} u - up
     * @param {Vector3} t - target
     * @returns {Quaternion}
     */
    q_lookAt(f: Vector3, u: Vector3, t: Vector3): Quaternion,

    /**
     * Creates a quaternion from the given Euler angles. All angles are in radians.
     * @public
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {Quaternion}
     */
    q_euler(x: number, y: number, z: number): Quaternion,

    q_eulerXYZ(x: number, y: number, z: number): Quaternion,

    /**
     * Extracts the Euler angle around the x axis from a quaternion.
     * @public
     * @param {Quaternion}
     * @returns {number}
     */
    q_pitch(q: Quaternion): number,

    /**
     * Extracts the Euler angle around the y axis from a quaternion.
     * @public
     * @param {Quaternion}
     * @returns {number}
     */
    q_yaw(q: Quaternion): number,

    /**
     * Extracts the Euler angle around the z axis from a quaternion.
     * @public
     * @param {Quaternion}
     * @returns {number}
     */
    q_roll(q: Quaternion): number,

    q_dot(q: Quaternion): number,

    /**
     * Combines two rotations. QuaternionA is applied before quaternionB.
     * @public
     * @param {Quaternion} a
     * @param {Quaternion} b
     * @returns {Quaternion}
     */
    q_multiply(a: Quaternion, b: Quaternion): Quaternion,

    /**
     * Interpolates between two rotations.
     * @public
     * @param {Quaternion} a
     * @param {Quaternion} b
     * @param {number} t - value between 0 and 1
     * @returns {Quaternion}
     */
    q_slerp(a: Quaternion, b: Quaternion, t: number): Quaternion,

    /**
     * Checks for quaternion equality within an epsilon.
     * @public
     * @param {Quaternion} a
     * @param {Quaternion} b
     * @param {number=} e - epsilon that defaults to 0.0001
     * @returns {boolean}
     */
    q_equals(a: Quaternion, b: Quaternion, e?: number): boolean,

    /**
     * Checks if quaternion is [0, 0, 0, 1]
     * @public
     * @param {Quaternion} quaternion
     * @returns {boolean}
     */
    q_isZero(q: Quaternion): boolean,

    /**
     * Returns the CardPawn for given Actor Id. To be used only from pawn side behaviors.
     * @public
     * @param {string} id - actor's id
     * @returns {CardPawn}
     */
    GetPawn(id: string): CardPawn,
};

// export type Rapier = typeof import("@dimforge/rapier3d");

type PhysicsExports = {
    PhysicsVersion(): string,
    Physics: any // Rapier
};


type FrameExports = {
    sendToShell(command: string, ...args: Array<any>)
}

export type THREE = typeof import("three");
type MicroverseModule = {THREE: THREE} & WorldcoreExports & PhysicsExports & FrameExports & {getViewRoot(): any};

export type BehaviorMethod = Array<string>;
export type PlaneMaterial = THREE.MeshStandardMaterial|Array<THREE.Material>;
export type Rotation = Quaternion|Vector3;

export type CardActor = ActorBehavior;
export type CardPawn = PawnBehavior;

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
    const Microverse: MicroverseModule
}

export class ActorBehavior {
    /**
The id of the CardActor.

        @public
        @type string
    */
    id: string

    /**
The id of the session.

        @public
        @type string
    */
    sessionId: string

    /**
The [x, y, z] translation of the card.

        @public
        @type Vector3
    */
    translation: Vector3

    /**
The rotation of the card in quaternion.
       @public
       @type Quaternion
    */
    rotation: Quaternion

    /**
The scale of the card in three axes.
       @public
       @type Vector3
    */
    scale: Vector3

    /**
       The layers property specifies how the card is treated when a special action is taken. Typical value are as follows:

- "walk": The avatar stays on the geometry of the card.
- "pointer": The pointer action is enabled.
- "portal": the avatar tests if the card it is going through needs to take the avatar to a connected world.

       @public
       @type Array

    */
    layers: Array<string>

    /**
       The cards in the world are organized in a hierarchical parent-children structure. The `parent` specifies its parent. Note that this is a "logical" structure. All cards are held as a direct child of the Three.JS scene, with automatic matrix composition for nested cards.

       @public
       @type CardActor
    */
    parent: CardActor

    /**
       The list of behavior modules installed to the card.

       @public
       @type Array

    */
    behaviorModules: Array<string>

    /**
       An informative string for the card.

       @public
       @type string
    */
    name: string

    /**
       The visibility of the card, and whether it responds to pointer events or not.

       @public
       @type boolean
    */

    hidden: boolean|undefined

    /**
      The Rapier Physics Engine object.

      @public
      @type any
     */

      rigidBody: any

    /**
       Any other values that the CardActor holds are stored in an object stored in the `_cardData` property. This is needed to mark the values to be stored in the persistent data.

       @public
       @type Object
    */
    _cardData: any

    /**
     The behavior object.
    */

    _behavior: any

    /**
     The unproxified base object of this behavior.
    */

    _target: CardActor

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
    future(time: number): this

    /**
       This method updates some elements in the `_cardData` object. The current value and the new values are merged to create the new `_cardData` object. As a side effect, it publishes `cardDataSet` Croquet event that can be handled by the pawn or any other subscribers.

       @public
       @param {object} options - keys and values to specify new values

    */
    setCardData(options:any): void

    /**
       This method updates the intrinsic properties of the object.
       @public
       @param {object} options - keys and values to specify new values

    */
    set(options:any): void

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
    This method removes a Croquet event subscription.
    @public
    @param {string} scope - the scope name of Croquet event
    @param {string} eventName - the event name of Croquet event
    @param {string|function} listener - the name of the handler in the calling behavior, or a function specified in the form of `this.mth`
       */

    unsubscribe<T>(scope: string, eventName: string, listener?:  string|((data: T) => void)): void

    /**
       This method publishes a Croquet event.

       @public
       @param {string} scope - the scope of Croquet event
       @param {string} eventName - the event name of Croquet event
       @param {any} data - serializable data to be published
    */
    publish<T>(scope: string, eventName: string, data?: T): void

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
     The physics simulation world for this card. It looks up the value in the parent chain, starting from itself, or the "global" one if the world has a single global simulation world.
     @public
     @type any
     */
    physicsWorld: any

    /**
     set the physics simulation world to the card.
     @public
     @param {any} v - the physics world
     */

    setPhysicsWorld(v: any)

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

    /**
       This method returns the Actor-side Worldcore service with the given name.

       @public
       @param {string} name - the name of the Actor-side Service.
    */
    service(name: string): any

    /**
    This method returns the current Croquet logical time.
    @public
    @type number
    */

    now(): number
}

export class PawnBehavior {
    /**
The id of the CardPawn.

        @public
        @type string
    */
    id: string

    /**
The viewId of the session.

        @public
        @type string
    */
    viewId: string

    /**
The id of the session.

        @public
        @type string
    */
    sessionId: string

    /**
The corresponding actor of this pawn:

        @public
        @type CardActor
    */
    actor: CardActor

    /**
       The cards in the world are organized in a hierarchical parent-children structure. The `parent` property specifies its parent. The pawn side implementation here returns a pawn if the card has a parent.

       @public
       @type CardActor
    */
    parent: CardPawn

    /**
       the shape property is the root of the visual appearance of the card. It is a THREE.Object3D.

       @public
       @type THREE.Object3D
    */
    shape: THREE.Object3D

    /**
The [x, y, z] translation of the card.

        @public
        @type Vector3
    */
    translation: Vector3

    /**
The rotation of the card in quaternion.
       @public
       @type Quaternion
    */
    rotation: Quaternion

    /**
The scale of the card in three axes.
       @public
       @type Vector3
    */
    scale: Vector3

    /**
       This method updates the intrinsic properties of the object. The values are sent to the actor.
       @public
       @param {object} options - keys and values to specify new values

    */
    set(options:any): void


    /**
     The behavior object.
    */

    _behavior: any

    /**
     The unproxified base object of this behavior.
    */

    _target: CardPawn

    /**
     The global transformation matrix for the object.
     @public
     @type Matrix4
    */

    global: Matrix4

    /**
      The local transformation matrix for the object.
      @public
      @type Matrix4
   */

    local: Matrix4

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
    future(time: number): this

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
       This method adds a Croquet event subscription. Unlike the version in the Croquet Library, this version removes the subscription with the same `scope` and `eventName` if it exists before adding a new one; so that it is safe to call this from the `setup()` of a behavior.

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
    This method removes a Croquet event subscription.
    @public
    @param {string} scope - the scope name of Croquet event
    @param {string} eventName - the event name of Croquet event
    @param {string|function} listener - the name of the handler in the calling behavior, or a function specified in the form of `this.mth`
    */

    unsubscribe<T>(scope: string, eventName: string, listener?: string|((evt: T) => void)): void

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

    /**
       This method returns the Pawn-side Worldcore service with the given name.

       @public
       @param {string} name - the name of the Pawn-side Service.
    */
    service(name: string): any

    /**
       This method returns the data of the specified asset as ArrayBuffer. The parameter is a string in the form of a full URL, relative path, or a Croquet dataId.

       @public
       @param {string} name - the string that specifies the asset location.
    */
    getBuffer(name: string): Promise<ArrayBuffer>

    /**
     Add an additional method to invoke at each display frame, typically modify the visual appearance of the object.
    */

    addUpdateRequest(spec: [string, string]): void

    /**
     Remove an additional method to invoke at each display frame, typically modify the visual appearance of the object.
    */

    removeUpdateRequest(spec: [string, string]): void
    /**
     recompute matrices
    */

    onLocalChanged()

    /**
    This method returns the current Croquet logical time.
    @public
    @type number
    */

    now(): number
}

export class AvatarActor extends ActorBehavior {
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

export class AvatarPawn extends PawnBehavior {
    /**
       isMyPlayerPawn flag indicates that this pawn is the local avatar.
       @public
       @type boolean
    */

    isMyPlayerPawn: boolean

    /**
       fallDistance governs the amount of fall per frame when the avatar is not on a walkable floor and isFalling is set
       @public
       @type number
    */

    fallDistance: number

    /**
       maxFall is the lower bound for the avatar to fall.
       @public
       @type number
    */

    maxFall: number

    get lookPitch(): number

    get lookYaw(): number

    get lookOffset(): Vector3

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

    /**
       This method add the pawn as the first responder so that the event of the specified type will be routed to the object first.

       @public
       @param {EventName} eventName - the name of the input event
       @param {EventMask} eventMask - whether the modifier keys should be checked
       @param {CardPawn} pawn - the first responder for the event
    */

    addFirstResponder(eventName: EventName, eventMask: EventMask, pawn: CardPawn)

    /**
       This method removes the pawn as the first responder so that the event of the specified type will no longer be routed to the object first.

       @public
       @param {EventName} eventName - the name of the input event
       @param {EventMask} eventMask - whether the modifier keys should be checked
       @param {CardPawn} pawn - the first responder for the event
    */

    removeFirstResponder(eventName: EventName, eventMask: EventMask, pawn: CardPawn)

    /**
       This method adds the pawn as the last responder so that the event of the specified type will be routed to the object when no other pawn handled it.

       @public
       @param {EventName} eventName - the name of the input event
       @param {EventMask} eventMask - whether the modifier keys should be checked
       @param {CardPawn} pawn - the first responder for the event
    */

    addLastResponder(eventName: EventName, eventMask: EventMask, pawn: CardPawn)

    /**
       This method removes the pawn as the last responder so that the event of the specified type will be routed to the object.

       @public
       @param {EventName} eventName - the name of the input event
       @param {EventMask} eventMask - whether the modifier keys should be checked
       @param {CardPawn} pawn - the first responder for the event
    */

    removeLastResponder(eventName: EventName, eventMask: EventMask, pawn: CardPawn)

    /**
       This method checks if given position (v) and rotation (q) collides with a portal in the world.

       @public
       @param {VQ} vq - the pose of the avatar
       returns {boolean}
    */

    collidePortal(vq: VQ): boolean

    /**
       This method checks if given position (v) and rotation (q) collides with an object with the walk layer.

       @public
       @param {Array<Mesh>} collideList - array of Meshes that have the walk layer.
       @param {VQ} vq - the pose of the avatar
       returns {boolean}
    */

    collideBVH(collideList: Array<THREE.Mesh>, vq: VQ): boolean

    /**
       This method checks if there is a mesh with walk layer toward the negative y direction from the position (v).
       @public
       @param {VQ} vq - the pose of the avatar
       returns {boolean}
    */

    checkFloor(vq: VQ): boolean
}
