# How to Migrate to Croquet Microverse Library 0.5 with the Color Space Change

[https://croquet.io](https://croquet.io)

## Introduction 

The Microverse Library 0.5 (`@croquet/microverse-library`) utilizes three.js version 153 to render the 3D scene. As mentioned in [this document](https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791), three.js has used the SRGB color space by default since version 152. This change was implemented to ensure future compatibility, especially as high dynamic range and wide-gamut become more prevalent in other tools. However, this change has caused alterations in the color of rendered results.

When you install the new version of the Microverse Library into your existing project by executing `npm install @croquet/microverse-library@latest`, you will observe a shift in colors. Here are a few actions you can take:

1. If you wish to minimize changes to rendering results while also taking advantage of new features, try adding the following lines to the `setup()` method of your `LightPawn` behavior. This is typically located in `csmLights.js` or `light.js`.

```JavaScript
// trm is ThreeRenderManager service obtained with this line:
// let trm = this.service("ThreeRenderManager");
// ...

trm.renderer.outputColorSpace = Microverse.THREE.LinearSRGBColorSpace;
trm.renderer.toneMappingExposure = 5; // or a value to change the brightness of the world
Microverse.THREE.ColorManagement.enabled = false;
```

Note that installing a new version of the Microverse Library into an existing project doesn't alter the files in behaviors/default, hence manual edits are required.

2. The default lights.js implementation now uses the toneMappingExposure value to set the property of the THREE.js renderer with the same name. You can adjust the base brightness with this value.

3. If you are prepared to accept some color alterations but need to preserve the colors of programmatically created objects, you will need to modify the hex value specified for the material. As described on this page, the THREE.Color class offers various methods such as convertLinearToSRGB(). To get a matching hex value manually, you can try something like:

```JavaScript
new THREE.Color(0xD86508).convertLinearToSRGB().getHex().toString(16);
```

or simply use `new THREE.Color(0xD86508).convertLinearToSRGB()`.

For textures, especially those loaded from files, you must explicitly specify the color space for the texture. If it is a visible bitmap type texture, set its colorSpace property in your code.

```Javascript
texture.colorSpace = Microverse.THREE.SRGBColorSpace;
```

However, if the texture is used for computation or numerical value is of significance, such as with a normal map (which they seem to consider a common case), you should not change the color space.


