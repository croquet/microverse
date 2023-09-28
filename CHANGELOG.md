# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

We generally group weekly changes into one dated entry on Fridays.

## 2023-09-22
### Fixed
- guarding accessing localStorage property as it may throw an error.

## 2023-09-15
### Fixed
- The path to load the basis library uses proper relative path.
- The initial Three.js canvas size is properly set.
- The touch based control button is properly styled, and it is hidden when gizmo is disabled.

## 2023-09-08
### Fixed
- handle devicePixelRatio correctly when offsetX and offsetY are used in input manager.
- Avoid having unnecessary nested iframes when replaceWorld is used.

## 2023-09-01
### Added
- An easier way to disable double down to jump by adding Constants.PointerDoubleDownAction property.
- More type declaration doc for vector functions.
- actor.positionTo checks arguments to allow two args invocation.

### Fixed
- The Import feature properly disabled when dragAndDrop.js is not loaded
- TypeScript module is loaded on demand from the core part of the system, not from prelude.js.

## 2023-08-25
### Added
- allow non-full window Microverse in a browser window.

### Fixed
- The compiled behaviors are handled without writing into the model.

## 2023-08-18
### Added
- You can use TypeScript to write a behavior. A behavior written in JS can use autocomplete available methods and properties.
- The 3D events have the pressure property for input coming from pressure sensitive input devices.

## 2023-08-11
### Added
- The nickname tag shows who is speaking over the dolby chat (thanks to Maksym Domaretskyi).

### Changed
- Allow an avatar to be "object" type without any visual appearances

## 2023-08-04
### Changed
- Use Croquet OS 1.1.0-34
- Move joystick into the Microverse iframe
- Make the shell iframe optional

### Added
- prelude.js can used to customize the JS context before Microverse starts up.

## 2023-07-28
### Changed
- Use THREE.js version 155.

### Added
- Support Meshopt decoder for GLB loading.

## 2023-07-21
### Added
- Support a GLB model with KTX2 texture.
- Add stopFalling message to AvatarModel to programmatically stop falling to ground.

### Fixed
- removeRigidBody should check if the physicsWorld is valid.
- GLB URL is inferred when ReadyPlayerMe gallery image link is pasted.

### Removed
- Some examples are moved out to individual example repos.

## 2023-07-14
### Changed
- Migrate to Three.js 152. A migration doc is addded.

### Fixed
- GLB loading from the Import menu now works.

### Added
- ReplaceWorld can take avatar data across transition.

## 2023-07-07
### Added
- alphaTest property for 2D card to support translucent PNG.

### Fixed
- 2D image card with depth 0 can be used.

## 2023-06-30
### Fixed
- Default csmLight.js properly publishes synchrnousCardLoaded event.

## 2023-06-16
### Changed
- Mention npm create croquet-microverse in the README to indicate that this is the standard way to start a project.

## 2023-06-09
### Fixed
- WalkManager.findIndex now uses the right format of data.

## 2023-06-02

### Added
- Add support for High pixel density displays
- Add the hidden property for a card that makes it invisible in the scene and ignore pointer events.

## 2023-05-26

### Fixed
- Transfering, or ctrl-click on a different card while another already has gizmo, is fixed.


## 2023-05-19
### Changed
- assetLoadError takes a serializable object as argument.
- github workflow cleaned up.
- Include a version of Worldcore in the repo.
- Use Croquet OS 1.1.0-22.

### Fixed
- Make video saveable as vrse.

### Added
- Some vector functions.


## 2023-05-12
### Fixed
- Some issues around full body avatars are ironed out.

### Added
- Sets can be stored in the persistent data.
- the instanceId property is added to user events.
- assetLoadError Behavior can show a load error image when asset file is not available.

### Changed
- Use THREE.js version 149.

## 2023-05-05
### Added
- publish a message when asset loading fails
- Ready Player Me full body avatar support is added.

### Changed
- use fillCacheIfAbsent more thoroughly

## 2023-04-21
### Changed
- use terser and not uglify

## 2023-04-14
### Changed
- wasd key down also make avatar start falling.
- user input event handlers are made immediate.

### Fixed
- Gizmo rotation is made sane.

## 2023-04-07
### Fixed
- Dolby.io echo cancellation is fixed by calling getUserMedia() carefully.

### Changed
- View side user event handling uses immediate event handling.

### Added
- Some documentations added.

## 2023-02-10
### Added
- show hit point in XR

## Changed
- user count now says "visitors"

### Fixed
- make pointer up/down/move events work again in XR
- log errors during event handlers instead of crashing

## 2023-01-20
### Changed
- clean up some demo files (and create library version 0.3.9).

## 2023-01-13
### Changed
- use jsdelivr instead of unpkg as the former is more stable.

## 2023-01-06
### Changed
- Tweak Joystick behavior.

## 2022-12-30

## 2022-12-23
### Added
- log some information when shift-click the property sheet.
- An option to specify scalar for rotateBy (to rotate around Y).

### Fixed
- Don't try to tear down Dolby audio when it was not built (when running on http).

## 2022-12-16
### Fixed
- double down jump properly display the avatar at the new position.
- DRACOLoader is loaded once per session, instead of every model load.
- Don't try to start Dolby audio when running on http.

### Changed
- Remove some log messages

### Added
- THREE.js based PositionalAudio (ongoing).
- Make "Enter VR button position customizable.

## 2022-12-09
### Changed
- 3D models handle fullBright property.
- turn on anti-aliasing for FireFox
- changed position update frequency in Dolby spatial audio.

### Added
- Buttons for PDF viewer and video player.

## 2022-12-02
### Changed
- Infer modelType from the suffix of a file name, if it is not .zip
- Use Worldcore 1.3.2 and Croquet 1.1.0-14
- Enable anti-aliasing for Safari
- Stop using cascading shadow map for a closed room like gallery.

### Added
- loadSynchronously property controls what to do until all objects with the flag are loaded.

### Fixed
- VideoPlayer for synchronous video playback work on Safari

## 2022-11-25
### Added
- Joystick gets mini arrows.

### Fixed
- Some documentation

## 2022-11-18
### Added
- VRMLLoader (modelType: "wrl") is added.
- A way to support different start up logic is being added.
- A way to disable the persistent data saving is added.

### Fixed
- Make sure that wonderland avatars can be used when voiceChat is enabled in a different way.

## 2022-11-11
### Added
- Dolby.io can be used for voice chat.
- A mechanism to allow switching object manipulator interface, and a different manipulator (pedestal) was added.

### Fixed
- perform a sanity check on the URL entered for avatar URL.

## 2022-11-04
### Fixed
- Home button works for spectators.
- Clean up settings panels so that they fit within landscape phone screens.

### Changed
- The "ENTER VR" button does not overlap with joystick.

### Added
- WalkManager is added, and the way the avatar can be more customizable.
- A simple synchronized video playback behavior is added.

## 2022-10-28
### Changed
- PDFView supports replacement of viewed document.
- Open property sheet button is iconic.
- Pressing the gather button does not close the world menu
- The microverse-library installation deletes old lib directory first.

### Added
- Property Sheet can be simply dragged.

## 2022-10-21
### Changed
- Gizmo look is updated. in particular tools are rendered in front of other objects.
- The user count is displayed at the top. Gather is now in the world menu.
- Event routing honor renderOrder so that object rendered in front with it is tested first.

### Added
- Better support for adding a card to avatar.

## 2022-10-14
### Changed
- webpack.config.js is changed to copy all files under assets automatically
- the world menu is updated.

### Added
- Broadcast mode is added.

## 2022-10-07
### Fixed
- Deletion of gizmo when a peer drops out or times out.
### Added
- Add text scroll feature to text fields.

## 2022-09-30
### Added
- World replace command (a lighter weight version of portals) is added.
- Support for getters/setters from a bahavior is added.
- The first version of Gizmo is added.

### Changed
- The handling of apiKey.js (now solely for production) and optional apiKey-dev.js (used if runniing locally) is changed.

## 2022-09-23
### Fixed
- Regression in non-VR environment at start up is fixed.

### Changed
- The direction of the mouse look on laptop is fixed.

### Added
- sourceURL in comment allows the behavior name show up in the developer tool.

## 2022-09-16
### Changed
- The settings interface uses avatar's 2D images stored on the server.

### Added
- sendToShell() function is available for behaviors.
- A mechanism for an avatar to bypass dormantAvatarSpec.
- a pawn side method getMyAvatar() is added.

### Fixed
- WebXR movement with joystick is fixed.
- an error in accessing isSessionSupported is properly handled.

## 2022-09-09
### Fixed
- Half body avatar movement improved.
- All use of iterating this.shape.children to remove elements makes a copy of the original array.

### Added
- The first cut of WebXR support.

## 2022-09-02
### Changed
- Version is updated to 0.1.7

### Fixed
- Loading a behavior in a VRSE file works again.
- Mitigate initial avatar rendering issues

## 2022-08-26
### Added
- Voice chat and Avatar selection page is added.

### Fixed
- Some code clean up.
- Further tweaking on avatar translucency.
- successive 3D model load requests handled properly (the last one wins)
- The half body avatar's hand position is tweaked.

### Modified
- Hooks around avatar customization.

## 2022-08-19
### Fixed
- properly show behaviors already selected in property sheet.
- Fixes around Ready Player Me half body avatars.
- Some issues around create-croquet-microverse.

### Added
- Bloom rendering pass to ThreeRender.js and a demo of using it.

## 2022-08-12
### Added
- A new smallfactory world is added (tentative).
- Convenience methods rotateBy, forwardBy, translateBy and scaleBy are added to CardActor
- Some work on Ready Player Me avatar support has been started.

### Fixed
- Some documentation updates.

### Changed
- Check the structure of import from a behavior file and warn the user if it is malformed.
- Use Worldcore version 1.3.1.

## 2022-08-05

### Added
- A way to remove the view-side update request (removeUpdateRequest()) is added.
- A Billboard behavior is added, and use it for the Auggie status.

### Fixed
- the view-side update request property handles multiple requests for the identical spec.
- Editing properties of a nested card handles the string parent field properly.
- Allow dropping a directory of .obj, .mtl and texture files work again.
- Allow Control-drag of a nested object.
- Typos in documentations.
- Mitigate timeout issue handling of non-microverse iframe.

### Changed
- stop using the external worldcore-three package but use a local customized version of ThreeRender.js.
- An optimization around setOpacity of avatars.
- An optimization around avatar look.
- Make text rendering one sided.
- Use a short name for the world name options for persistent data lookup.
- Not to add event listeners when text is read only.

## 2022-07-29

### Fixed
- Regression on dropping PDF is fixed.
- Property cache named assset data.
- Prevent buildup of socket connections for bitcoin tracker.
- Revoke objectURL sooner for an image texture.

### Changed
- The logic to extract values from git for version.txt is changed.
- The on demand update request from a pawn behavior is called after the "super" version of update is called.

### Added
- Option key/Alt key as an alternative to Control to invoke control.


## 2022-07-22

### Fixed
- Links in tutorial documentation are fixed.
- The elements in the property sheet need to have sane z-coordinates.
- Prevent redundant creation of portal frames.
- Make Portal rendering somoother.

### Changed
- The set of behaviors loaded into a Microverse world when connected is narrowed down to the directory specified as UserModuleDirectory.

### Added
- A feature to hide the joystick and fullscreen button from shell upon a request from an iframe.


## 2022-07-15

### Added
- A URLlink demo feature is added to the default world.
- A 3D text demo is added.
- A cache mechanism is added to the AssetManager (./docs/AssetManager.md).
- A Newton's Cradle demo is added to the default world.

### Changed
- The dataScale for an object loaded from a world file gets [1, 1, 1] by default.

### Removed
- The pendulum demo is removed from the default world (still available in the campus world.)

### Fixed
- The clipping of a long menu works better.

## 2022-07-08

### Added
- Experimental TextGeometry based 3D text is added.

### Changed
- Use a local only default key when the apiKey.js is not found.

## 2022-07-01

### Added
- The default gallery world has the Auggie Award statue.
- The crane and boxes improved in the factory world.

### Fixed
- Future call made from a behavior with arguments works properly.
- Loading a VRSE with a nested structure translated property.
- Typos and errors in Documentations are fixed.

### Changed
- Made Three.JS animation under the control of Microverse code.
- Do not import the shell code into a Microverse frame.
- Fix documentation.
- The global variable visible from a behavior is called Microverse, instead of Worldcore.

## 2022-06-24

### Added
- Open Source license is now added. (and repositories are re-organized).

### Changed
- Tweaks to the factory and the art galley examples worlds.
- All system behaviors is now implicitly loaded, unless SystemBehaviorModules constants overrides it.

### Removed
- Unused font files and style files from assets/fonts directory

## 2022-06-17

### Added
- A factory world, with many interactive objects, is added.

### Changed
- Turn off anti-aliasing on mobile and Safari.
- The AvatarNames constantcs can take an object to have a different avatar model.

### Fixed
- Spawn point specification honors the y coordinates.
- Walking up stairs is now robust.
- PDF view sets last page scroll position properly.
- Further improvements in going through a portal with followers.

## 2022-06-10
### Added
- A way to display iframes for connected worlds in the tiled view.

### Fixed
- Continuing improvements in walk and hit detection.
- Continuing improvements in portals.
- Properly handle modules with the same name at different file paths.

### Removed
- the multiuser flag was removed (in favor of the SingleUser behavior moduele).
- `setTranslation()` and `setRotation()` for Card was removed (in favor of `translateTo()` and `rotateTo()).

## 2022-06-03
### Added
- The start of two way Portals.
- SingleUser behavior added.

### Fixed
- Performance issues in the PDF viewer.
- Continuing improvements in walk and portal hit detection. adding another walkable card is again possible.
- Continuing improvements in portals.
- Property Sheet colors adjusted.

### Changed
- The effects on portal.
- The pendulum has scale for convenience.
- The default world is now the art gallery, with a portal into the refinery world.
- 2D cards use toneMapping flag.

## 2022-05-27
### Added
- Paste an image, a text or url text to create an appropriate object.
- A PDF file can be dropped to launch a PDF viewer.
- A campus world with live map.

### Fixed
- Further improvements of avatar walk.

### Changed
- SpinActor checks the releasing movements more carefully.
- Flat cards are now rendered only one side.
- Use PhongMaterial for flat cards.

## 2022-05-20
### Added
- Particle effect for portals.
- A feature to caputure the pointer with the first responder mechanism.
- Immediate local avatar movement before updating peers.

### Fixed
- Portals clipping issues.
- Collision with walls and floor works smoother.
- Watch server works on Windows by handling backslash path properly.

###Changed
- Extruded Shape has z=0 at center.
- the default index.html now has <DOCTYPE !html>

- 2022-05-13
- Added
- Full screen mode work with portals

### Changed
- Use .vrse extension for saved/exported file name.
- Make Avatar be a kind of card, thus one can write behaviors for it.
- The world menu is moved to top right.

### Fixed
- A divergence issue due to a view code used in model.
- Avatar look is preserved when walking through a portal.
- The faucet in the cascade demo can be moved.
- Embedding Microverse into an iframe works.
- A whiteout bug due to 0 being treated as falsy.

## 2022-05-06
### Added
- A new layer called "portal".
- A way to create a new card with Sticky Note.

### Changed
- The default value for multiuser flag is now true.
- The behaviors of an exported card are detatched from the file editing.
- Instead of "_" change event names, use the property name + "Set" for change event names.

### Fixed
- Memory Leak in Rapier.js.
- Saving a card only save the file for the initiating user.
- Movement after coming back from dormancy.

### Pending
- Avatar collision with walls.
- Numerous improvements to the Portals.

## 2022-04-29
### Added
- The follow button has participant count readout.
- The follow feature works also when the leader goes to the birds eye view.
- Avatars translucency adjustment when following or being seen through a portal.
- The Rapier-based physics simulation. (rapier.js and collider.js)
- The prototype version of portals.
- Save an individual card into a file.

### Changed
- 3D events that event handler receives has the "xy" property that is in the display coordinates.
- Spin behavior uses xy to spin an object a bit more smoothly.

