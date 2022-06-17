# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

