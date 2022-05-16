# Croquet Microverse Builder

![Microverse Screenshot](https://croquet.io/images/microversess.png)

## Description

Croquet Microverse Builder is a framework to build multiplayer immersive 3D virtual worlds on the web. It is built on the Croquet OS and the Worldcore framework with some other key features.

* [Croquet OS](https://croquet.io/docs/croquet) provides a clean substrate to build multiuser applications.
* [Worldcore Framework](https://croquet.io/docs/worldcore) provides an abstraction to build 3D applications on top of Croquet OS.
* "Cards" and "Behaviors" abstractions provides a uniform object model, and pluggable behavior descriptions for those objects.It also allows integration with your text editor to support multiuser live programming.
* [Three.JS](https://threejs.org) provides industrial strength 3D rendering backend.
* All Web technology in your browser is available to access different media, real world data into the virtual world, and vice versa.

By combining all together, Croquet Microverse Builder helps developers to create a metaverse world interactively and quickly. And, the deployed web app requires zero-installation to run on users computers.

## Documentation

The documentation for the Microverse Builder is located in the [docs](./docs) directory.

* [docs/QuickStart.md](./docs/QuickStart.md) - Quick Start guide to Microverse IDE
* [docs/Tutorial.md](./docs/Tutorial.md) - Tutorial on using the Microverse IDE
* [docs/CardSpec.md](./docs/CardSpec.md) - Specification for Microverse Cards 
* [docs/Development.md](./docs/Development.md) - Development Guide on building Microverses
* [docs/Rapier.md](./docs/Rapier.md) - Using the Rapier Physics Engine in Microverses

## Installation
Please refer to the [docs/QuickStart.md](./docs/QuickStart.md) to get started.

If you just want to try it out quickly, follow these steps:

1. Clone or fork the Github repository from <https://github.com/croquet/microverse-builder>.
   <br>`git clone https://github.com/croquet/microverse-builder.git` 
2. Obtain your Croquet API Key from <https://croquet.io/keys/>.
3. Open a terminal and change the working directory to your new Microverse-Builder folder.
   <br>`cd microverse-builder`
4. Create the apiKey.js file from apiKey.js-example and the API Key above.
   <br>`cp apiKey.js-example apiKey.js # and edit apiKey.js`
5. In the terminal run:
   `npm i`
and then
   `npm start`
6. Open browser at `localhost:9684` and enter a new world.
7. Copy the URL shown in the browser tab and copy it into a new tab. Also, replace localhost with the IP address (probably something like 192.168.0.123) and open it from another device on the local network.

## Discussion / Contributing
Join the [Croquet Community Discord](https://discord.gg/9U9MKSbJXS) to talk about the Microverse Builder. We love to hear your feedback.

Also follow us on [Twitter](https://twitter.com/croquetio) for important announcements.

## License
Croquet Microverse IDE is governed by the [Croquet Developer License Agreement](https://croquet.io/terms.html)

**Copyright (c) 2022 Croquet Corporation**
