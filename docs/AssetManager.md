# The Public Interface of AssetManager

[https://croquet.io](https://croquet.io)

## Introduction
Croquet Microverse has a "service" called AssetManager. AssetManager loads asset files (images, vector graphics, and 3D models) and helps the Microverse system create cards. AssetManager also implements a simple caching mechanism to reduce network traffic and asset decoding.

As AssetManager deals with external resources, it is only available from the view (pawn) side code. This document describes how to use it to load assets and cache them if desired.

The main functionality of AssetManager is written in `src/assetManager.js`. Its core part does not depend on Microverse or Worldcore, but then the core is wrapped as a Worldcore service in `src/wcAssetManager.js`. Typically you get to the core features of AssetManager with expression `this.service("AssetManager").assetManager`.

## Handling File Drop Events

The `setupHandlersOn(dom: HTMLElement, callback?: (buffer, fileName, type) => void)` method adds a DOM event handler for drop event on the specified DOM element. Upon a drop event, the system determines the `type` of the file based on the file name, extracts the file content into an `ArrayBuffer` and invokes the callback.

Microverse uses it in this manner:

```JavaScript
this.service("AssetManager").assetManager.setupHandlersOn(document, (buffer, fileName, type) => {
    if (type === "pastedtext") {
        this.pasteText(buffer);
    } else if (type === "vrse") {
        this.loadvrse(buffer);
    } else {
        this.analyzeAndUploadFile(new Uint8Array(buffer), fileName, type);
    }
});
```

The call to AvatarPawn's `analyzeAndUploadFile()` creates a new card with a proper card spec. The `CardPawn` of the card constructs a 3D or 2D view based on the card spec.

## Loading an asset from an Uint8Array

The AssetManager implements a method called `load(buffer:Uint8Array, type:string, THREE:Module, options)`. Typically the buffer and type are simply passed from the callback. (`THREE` is passed in to use the feature written in code that does not assume a JS bundler. `Options` affects some properties of the loaded object.)

If the buffer contains data of a known type (currently "glb", "obj", "fbx" for 3D, "svg", "png", "jpg", "jpeg", "gif" for 2D and "exr" for the sky box are supported), the load method returns a promise that resolves to a Three js `Object3D`, a Three.js `Texture`, or Three.js EXR data, respectively.

For SVG, you can pass an option that specifies the `color`, `depth`, and `fullBright` properties to affect the properties of the resulting 3D object with ExtrudedGeometry.

## Caching Data

The AssetManager offers a simple caching mechanism. You can think of the cache as a mapping from an id to the data, associated with the list of "users" of the data.

### `setCache(dataId:string, data:any: id:string)`

The `setCache()` method creates a new cache entry for data named `dataId`, and `id` as the first user of this data.  Unlike the variable names suggests, the `dataId` can be any string (typically a path, url or Croquet DataId), and `id` can be any string (typically the `id` of a pawn).

### `getCache(dataId:string):any`

The `getCache()` method retrives the data specified by the `dataId`. It returns null if the specified entry is not found.

### `fillCacheIfAbsent(dataId:string, func:()=>any, id:string):any`

The `fillCacheIfAbsent()` method is a combination of `setCache` and `getCache`; it adds a new cache entry if the item is not found by calling `func`, and either case returns the specified cache entry.

### `revoke(dataId:string, id:string)`

The `revoke()` method tells the AssetManager that the object  specified by `id` no longer uses the data. If the list of users for data becomes empty by removing `id`, the data is freed.

### Usage in Microverse

While the caching mechanism of the AssetManager expects that `revoke()` is called manually, Microverse manages the revoke call automatically for known cases. For a card of `"3d"` type, the loaded buffer is added to the cache to avoid multiple loading. (The created 3D model is not cached however as Microverse sometimes mutates a loaded 3D model.)  For a `"2d"` card with a texture, Microverse caches the Texture object. The `destroy()` method of a CardPawn calls `revoke()` for those data, so if the card being destroyed is the last user the resource is freed.

**Copyright (c) 2022 Croquet Corporation**
