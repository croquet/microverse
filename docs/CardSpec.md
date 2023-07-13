# Croquet Microverse Card Specification (CardSpec)

[https://croquet.io](https://croquet.io)

## Introduction

A card in Croquet Microverse is defined as a declarative specification. The specification can be serialized into JSON and transmitted or stored, and then can be loaded into a different Croquet Microverse world, used to start a new world.

A specification can be also used to rebuild an existing card without losing identity. This allows you to interactively build up a world while exploring different alternatives quickly.

For example, we have a 3D model of a car with a behavior that makes the car drivable:

![A Car Example](./assets/porsche.png)

It is defined as:

```JavaScript
    translation: [10, -1.672, -11],
    rotation: [0, 0, 0, 1],
    layers: ["pointer"],
    type: "3d",
    behaviorModules: ["Drive"],
    name: "porsche",
    dataLocation: "...",
    dataRotation: [-0.7071067811865475, 0, 0, 0.7071067811865476],
```

In the following, we describe the properties and how they interact with each other.  You can see examples in the files in the `worlds` directory, and also some behaviors use the specification to create a new card dynamically with the call to `createCard()`.

## Concepts

A card is specified by a JSONable set of properties. The properties specify:
1. where the card is spatially situated
2. how it interacts with the user pointer interaction
3. how it looks
4. what user-defined behavior it has
5. data specific to user-defined behaviors.

We group these properties into four categories, "spatial", "pointer", "visual", and "code"/"card data".


Many properties have types of three-element array for (x, y, z) vector, or four-element array for a quaternion.

```TypeScript
type Vector3 = [<number>, <number, <number>]
type Quaternion = [<number>, <number, <number>, <number>]
```

Also, typically a rotation type can take an Euler angle. Namely, if a three-element array is specified for rotation it is interpreted as an Euler angle. So the "Rotation" type can be represented as follows and the value is intepretered based on the length of the array.

```TypeScript
type Euler = [<number>, <number, <number>]
type Rotation = Quaternion|Euler
```

## Spatial Properties

---

### Name

`translation`

### Category

spatial

### Type

```TypeScript
Vector3|undefined
```

### Description

Specifies the xyz coodinates of the card. It defaults to [0, 0, 0] when not specified.

---
### Name

`scale`

### Category

spatial

### Type

```TypeScript
Vector3|undefined
```

### Description

Specifies the scale in xyz axes of the card. It defaults to [1, 1, 1] when not specified.

---

### Name

`rotation`

### Category

spatial

### Type

```TypeScript
Rotation|undefined
```

### Description

Specifies the rotation of the card. It defaults to [0, 0, 0, 1] (unit rotation) when not specified.

---

### Name

dataTranslation

### Category

spatial

### Type

```TypeScript
Vector3|undefined
```

### Description

A 3D model loaded as part of a card may have its own offset. You can use dataTranslation as a "one time" fix to translate the 3D model when loading.

Specifies the xyz coordinates of the translation for the loaded model. It defaults to [0, 0, 0] when not specified.

---

### Name

dataScale

### Category

spatial

### Type

```TypeScript
Vector3|undefined
```

### Description

A 3D model loaded as part of a card may have its own scale. You can use dataScale as a "one time" fix to scale the 3D model when loading.

Specifies the xyz scale of the loaded model. It defaults to [1, 1, 1] when not specified. If you load 3D model interactively by dragging and dropping from your OS, Croquet Microverse adjusts this value so that the card has a reasonably sized 3D model. You can specify this value to fix the automatic scaling.

---

### Name

dataRotation

### Category

spatial

### Type

```TypeScript
Rotation|undefined
```

### Description

A 3D model loaded as part of a card may have a rotation that does not match with the orientation of the card. You can use dataRotation as a "one time" fix to rotate the 3D model when loading.

Specifies the rotation of the loaded model. It defaults to [0, 0, 0, 1] (no rotation) when not speficied.

---

### Name

parent

### Category

spatial

### Type

```TypeScript
string|CardActor|undefined
```

### Description

This property sets up the display scene hierarchy. Special care is taken when an actual CardActor is passed in, and also during an initialization the interpretation of the value changes.  See more information on the `parent` property below.

---

### Name

spawn

### Category

spatial

### Type

```TypeScript
"default":string
```

### Description

This is a special property whose only supported value is "default". If there is a card with this value, the translation and the rotation of the card is used as the "spawn point" of the world for an newly joining avatar.

---

## Pointer Properties

---

### Name
`layers`

### Category
pointer

### Type

```TypeScript
type Layers = "walk"|"pointer"|"lighting"|"portal"
Array<Layers>|undefined
```

### Description

It is an array of "walk", "pointer", "lighting", and future extensions.  If the value contains "walk", the avatar uses the "find floor" mechanism to keep its y coordinates. If the value contains "pointer", user interaction via the pointing device takes this object into account. It defaults to `["pointer"]`.

---

## Visual Properties

---

### Name

`type`

### Category

visual

### Type

```TypeScript
"2d"|"3d"|"lighting"|"object"|"code"
```

### Description
When it is "2d", it creates a 2d flat object and enables optional texture specification (see texture related properties below).
When it is "3d, it loads an 3D data from `dataLocation`.
When it is "text", the card becomes a text area.
When it is "code", it creates a text area but has some more functionality to support in world code editing.
When it is "object" or `undefined`, custom behavior code is expected to set the cards' visual appearance.

---

### Name

`hidden`

### Category

visual


### Type

```TypeScript
boolean|undefined
```

### Description
The value specifies whether the root of the Three.js objects for the card to have the `visible` flag set or not. The value defaults to false (that is the visible flag to be true).

When the hidden flag is true, the card also stops responding pointer events.

---

### Name
`dataLocation`

### Category

visual

### Type

```TypeScript
string|undefined
```

### Description
The value is interpreted as URL, fragment of URL, Croquet Data ID or `undefined`

It contains the location of SVG or 3d model data.  It is a URL, either full URL or a relative path from the application, or Croquet Data ID.

If you drag and drop a file to create a card, you can open the Property Sheet by ctrl- or alt-click and then click on the property sheet icon to check the value of dataLocation for its Data ID.

---

### Name
`width` and `height`

### Category
visual

### Type

```TypeScript
type Meter=number
Meter|undefined
```

### Description

The width and height of the card with "2d" as its type. The values are interpreted as "meters".

Both default to 1.

---

### Name

`depth`

### Category

visual

### Type

```TypeScript
type Meter=number
Meter|undefined
```

### Description
When the cards "type" is "2d", depth is used to specify the amount of extrusion. It defaults to 0.05 (in meters).

---

### Name

`cornerRadius`

### Category

visual

### Type

```TypeScript
type Meter=number
Meter|undefined
```

### Description
When the cards "type" is "2d", `cornerRadius` specifies the radius of the rounded corner. It defaults to 0 (in meters).

---

### Name
`color`

### Category
visual

### Type

```TypeScript
Type Color=number
Color|undefined
```

### Description

When the "type" is "2d", the value is used for the surface of the 2D card. The value is also available from a behavior and typically used to specify the color of the generated Three.js materials.

When the "type" is "text" or "code", the value specifies the text color.

---

### Name

`frameColor`

### Category

visual

### Type

```TypeScript
Type Color=number
Color|undefined
```

### Description

When the "type" is "2d", the value is used for the edge of the 2D card.

---

### Name

`alphaTest`

### Category

visual

### Type

```TypeScript
number|undefined
```

### Description

When the "type" is "2d" and "textureType" is "image", and "alphaTest" is defined, the value is used for the alphaTest property of the resulting material for the image. This is useful when you need to show a transparent PNG in the world.

---

### Name

`shadow`

### Category

visual

### Type

```TypeScript
boolean|undefined
```

### Description

It specifies whether the created object should cast shadow or not. It defaults to `true`.

---

### Name

`textureType`

### Category

visual

### Type

```TypeScript
Type TextureType = "image"|"canvas"
TextureType|undefined
```

### Description
When it is "image", it loads an image data from `textureLocation` and creates Texture of Three.js.
When it is "canvas", it creates a DOM canvas and binds it to CanvasTexture of Three.js.
When it is undefined, it does not allocate a texture

The created texture is assigned to `this.texture` property of the `CardPawn`.

--- 

### Name

`textureLocation`

### Category

visual

### Type

`string|undefined`

### Description

URL, fragment of URL, Croquet Data ID or `undefined`

It contains the location of an image data. It is a URL, either full URL or a relative path from the application, or Croquet Data ID.

If you drag and drop an image to create a card, you can open the Property Sheet by ctrl- or alt-click and then click on the property sheet icon to check the value of textureLocation for its Data ID.

--- 

### Name

`textureWidth` and `textureHeight`

### Category

visual

### Type

```TypeScript
type Pixels=number
Pixels|undefined
```

### Description

Those values specify the texture's size in pixels, when the `type` is "2d".

They default to 512.

---

### Name

`fullBright`

### Category

visual

###

```TypeScript
boolean
```

### Description

When type is "2d", it specifies whether the texture is rendered without regarding to lighting.

---

### Name

`singleSided`

### Category

visual

### Type

```TypeScript
boolean
```

### Description

When type is "3d", it specifies whether the model should be rendered the both sides of the geometry.

---

### Name

`flatten`

### Category

visual

### Type

```TypeScript
boolean
```

### Description

When type is "3d", and the value is true, the system tries its best to remove the nested Object3D structure and merge meshes with the same texture.

---

### Name

`placeholder`

### Category

visual

### Type

```TypeScript
boolean
```

### Description

Put a simple Three.js object while loading a (large) 3D model.  When the model loading is finished the placeholder will be removed automatically.

---

### Name

`placeholderSize`

### Category

visual

### Type

```TypeScript
Vector3
```

### Description

Specifies the size of the placeholder object.

---

### Name

`placeholderColor`

### Category

visual

### Type

```TypeScript
type Color=number
Color|undefined
```

### Description

Specifies the color of the placeholder object.

---

### Name

`placeholderOffset`

### Category

visual

### Type

```TypeScript
Vector3
```

### Description

Specifies the position of the placeholder object.

---

### Name

`avatarParts`

### Category

visual

### Type
boolean|undefined

### Description

The avatar can apply a special visibility treatment for a card that is attached to it; so that objects don't occulude the user's view. The avatarParts flag enables the visibility changes. (e.g., the name tag above the avatar's head has this flag.)

---

### Name

`textScale`

### Category

visual

### Type
number|undefined

### Description

When the card's type is "code" or "text", "textScale" specifies the scaling factor between the pixel-based font size and "meters". Typically font metric is specified in a range such as 20 to 50, while the dimension of a 3D objects corresponds to meters. When undefined, it defaults to 0.025.

---

### Name
`noDismissButton`

### Category
visual

### Type

```TypeScript
boolean
```

### Description

When the card's type is "code" or "text", "noDismissButton" specifies whether the text field gets the dismiss button. It defaults to false.

---

### Name
`readOnly`

### Category
visual

### Type

```TypeScript
boolean
```

### Description

When the card's type is "code" or "text", "readOnly" specifies whether the text field can be edited or not.It defaults to false.

---

### Name
`backgroundColor`

### Category
visual

### Type

```TypeScript
nubmer
```

### Description

When the card's type is "code" or "text", "backgroundColor" specifies the color of the text field. The `color` specifies the color of the characters.

---

### Name
`autoResize`

### Category
visual

### Type

```TypeScript
boolean
```

### Description

When the card's type is "code" or "text", "autoResize" specifies whether the text field should resize itself to show entire text contents. It defaults to false.

---

### Name
`singleLine`

### Category
visual

### Type

```TypeScript
boolean
```

### Description

When the card's type is "code" or "text", "singleLine" specifies whether the text field should wrap when the content exceeds the specified `width`. It defaults to false.

---

### Name

`margins`

### Category

visual

### Type

```TypeScript
let Pixels=number
{left<Pixels>, top<Pixels>, right<Pixels>, bottom<Pixels>}
```

### Description

When the card's type is "code" or "text", "margins" specifies the margins of the text field.

---

### Name

`loadSynchronously`

### Category

visual

### Type

```TypeScript
boolean?
```

### Description

When there is a card with type "2d" or "3d" and with the property "loadSynchronously" set to be true, and also the SynchrnousCardLoader behavior module is attached to a card in the system, the system sends synchronousLoadCardsStarted and allSynnchronousCardsLoaded events. See the details in `behaviors/default/synchronousLoad.js` for more details.

---

### Name

`toneMappingExposure`

### Category

visual

### Type

```TypeScript
number
```

### Description

When specified for a light, the default implementation of lights uses the value to set the toneMappingExposure property of THREE.js renderer to control the brightness of the over all scene. The system uses 1.4 as default.

## Code Properties

---

### Name

`behaviorModules`

### Category

code

### Type

Array<string>|undefined

### Description

Specifies the names of behavior modules.

---

### Name

`className`

### Category

code

### Type

string

### Description

Specifies the names of a subclass of `CardActor` to be instantiated. While being obsoleted you can create a subclass of the `CardActor` and `CardPawn` to create an application. When specified, `className` decides which JavaScript class is to be instantiated as the card.

---

### Name

`name`

### Category

code

### Type

```TypeScript
string
```

### Description

When specified the Three.js object created for this card will get the `name` property with this value. It can be used from behavior code.

---

### Name

`noSave`

### Category

code

### Type

```TypeScript
boolean
```

### Description

When true, the card is not stored in the persistent data. Currently all children of a card with `noSave` also need to have the flag set explicitly.

---

## The `parent` property

The `parent` property is used differently depending on the context. In the world file (such as `default.js`), you sometimes want to specify hierarchical cards. As a shorthand, you can specify the `Constants.DefaultCards with a simple `id` field and refer to it from subsequent cards:

```JavaScript
Constants.DefaultCards = [
    {
        card: {
            name: "bitcointracker",
            ...
            behaviorModules: ["Elected", "BitcoinTracker"],
        },
        id: "main",
    },
    {
        card: {
            name:"bitlogo",
            parent: "main",
            ...
            behaviorModules: ["BitLogo"]
        }
    },
    {
        card: {
            name:"bar graph",
            ...
            parent: "main",
            behaviorModules: ["BarGraph"],
        }
     }
]
```

The name `main` is local with in the list, and when `DefaultCards` is processed, the (temporary) name `main` is used to make the last two cards be children of the first.

When a card is created from a program, you can use the `createCard` method of a `CardActor`:

```JavaScript
labelCard = this.createCard({
   name: item.label,
   className: "TextFieldActor",
   translation: [0, 0, 0],
   parent: this,
   type: "text",
   margins: {left: 8, top: 0, right: 16, bottom: 0},
   readOnly: true,
   singleLine: true,
   autoResize: true,
   noDismissButton: true,
   runs: [{text: item.label}],
   behaviorModules: ["MenuItem"],
   width: 1,
   textScale: 0.0020,
   height: 0.15,
   noSave: true,
   fullBright: true,
   backgroundColor: item.selected ? 0x606060 : 0xFFFFFF
});
```

For convenience, you can pass in an object as the value for `parent` in this case.

---

## Other properties

As long as a value can be serialized in JSON, you can specify a new property in the card specification with any property name. You can use the value from a behavior you attach to the card. Such a value is stored in the actor's property called `_cardData`. A behavior for the CardActor can read and write the value by accessing `this._cardData.foo`, and a behavior for the CardPawn can read the value by accessing `this.actor._cardData.foo`.

A behavior can create a property on the model directly, namely to execute something like `this.foo = 42`. this is fine but the value will not be stored in the persistent data; so when you run the new session with a new version of Croquet Microverse, such a value will not be carried over. Choose to store the value in `_cardData` if you want to carry a value over to a new session from persistent data, or store it directly in the actor when that is not necessary.

**Copyright (c) 2022 Croquet Corporation**
