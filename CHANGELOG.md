# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

