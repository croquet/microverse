# Croquet Microverse (Beta)

![Microverse Screenshot](https://croquet.io/images/microversess.png)

[https://croquet.io](https://croquet.io)

## Getting Started

A new project can be started by running `npm create croquet-microverse@latest` in an empty directory on your computer and then run `npm start` in the directory. For more information, refer to The [Quick Start Guide](https://croquet.io/docs/microverse/index.html). This repository contains the "Microvese Library" that can be used new projects. If you wish to learn more about Microverse, or modify code in the library to enhance it for your projects, please read on the following.

## Description

Croquet Microverse is a framework for building multiplayer immersive 3D virtual worlds on the web. It is built on the Croquet OS and the Worldcore framework.

* [Croquet OS](https://croquet.io/docs/croquet) provides a clean substrate for building multiuser applications.
* [Worldcore Framework](https://croquet.io/docs/worldcore) provides an abstraction for building 3D applications on top of Croquet OS.
* "Cards" and "Behaviors" abstractions provide a uniform object model, and pluggable behavior descriptions for those objects. It also allows integration with your text editor to support multiuser live programming.
* [Three.js](https://threejs.org) provides an industrial-strength 3D rendering backend.
* All Web technology in your browser is available, so the virtual world can access different media, real-world data etc, and vice versa.

By combining all together, Croquet Microverse helps developers to create a metaverse world interactively and quickly. Crucially, the deployed web app requires zero-installation to run on users computers.

## License

The source code and assets in this repository are licensed under Apache License 2.0.

## Enter a publicly deployed world

The quickest way to get a feel for Microverse is to visit a default world served from the Croquet site:

1. Point your browser at https://croquet.io/microverse.
2. Once the world loads, navigate around by dragging the joystick at bottom center of the window.  At this point you are alone in a newly generated private world, that is identified by the extended URL (with automatically added session ID and password) that now appears in your browser's address bar.
3. To bring additional users into this world, load the extended URL in another browser tab.  You could do this by...
   * copying the URL from the address bar and pasting it in a fresh tab, or
   * sending the copied URL to a friend, to load in their own browser, or
   * clicking the hamburger menu at top right, and pointing your phone camera at the QR code that appears.
4. All browser tabs with the same URL are in the same world.  As you navigate in any tab, everyone else can see your avatar.  As you interact with objects, everyone else can see you interacting.

The worlds on the Croquet server cannot be modified by you.  But if you are a developer who already has the tools `git` and `npm`, follow these steps to get a taste of how straightforward it is to set up your own shareable worlds:

1. Open a terminal.
2. Clone this GitHub repository.
   <br>`git clone https://github.com/croquet/microverse.git`
3. Enter the resulting microverse folder.
   <br>`cd microverse`
4. Install the Microverse.
   <br>`npm install`
5. Start a Microverse code server.
   <br>`npm start`
6. Point your browser to `localhost:9684`.  As in the publicly deployed example above, you will find yourself alone in a new world, at a URL that has automatically been extended with a session ID and password.
7. To join this world from other browsers on the same computer, copy and paste the extended URL.
8. [bonus activity] To join the world from other devices that are on the same network, you'll need a URL in which `localhost:9684` is replaced with your computer's IP address.  If you don't know the address, one place to find it is in the output from the `npm start` that you ran in step 5.  Look for a line of the form

   `[webpack-dev-server] On Your Network (IPv4): http://192.168.nnn.mmm:9684/`

   ...and don't forget to add the session ID and password parts of the URL. Once you have loaded this URL on any device, the QR code that it will display from the hamburger menu will work for other devices on the same network.

To learn more about modifying Microverse code and worlds, and obtaining the API key that will let you deploy them beyond your local computer, see the documentation below.
## Documentation

The documentation for the Croquet Microverse is located in the [docs](./docs) directory.

* [docs/QuickStart.md](./docs/QuickStart.md) - Quick Start guide to Microverse IDE
* [docs/Development.md](./docs/Development.md) - Development Guide on building Microverses
* [docs/Card.md](./docs/Card.md) - The methods and properties of the Card classes.
* [docs/Avatar.md](./docs/Avatar.md) - The methods and properties of the Avatar classes.
* [docs/CardSpec.md](./docs/CardSpec.md) - Specification for Microverse Cards
* [docs/Elected.md](./docs/Elected.md) - The Election mechanism to choose a peer.
* [docs/Physics.md](./docs/Physics.md) - Using the Rapier Physics Engine in Microverses
* [docs/Tutorial.md](./docs/Tutorial.md) - The introduction to tutorials
* [docs/Tutorial1.md](./docs/Tutorial1.md) - The tutorial part 1.
* [docs/Tutorial2.md](./docs/Tutorial2.md) - The tutorial part 2.


**Copyright (c) 2022 Croquet Corporation**
