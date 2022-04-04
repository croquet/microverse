# Installation Guide for Croquet Microvese (April 4st, 2022)

There are a few steps that are not fully streamlined, but things are working.

## 1 Download the package.
There will be an easier way to do this step, and it will get you a directory with a better name, but right now, you download a tarball:

https://croquet.io/devcroquet-microverse-public-0.0.7.tgz

and extract all files. that will create a directory called "package".  You can rename the "package" directory to your choice.

## 2. Make apiKey.js
Create a file called by apiKey.js, by copying "apiKey.js-example" to apiKey.js and then edit the two variables called appKey and appId in it.

## 3. Run npm install
Run npm install in the directory.

## 4. Run npm run start
Run `npm run start` in the directory.  It will run the file server on localhost:9684 (notice that it is not 9000). So open the place with your browser.

## 5. Run npm run watch-server
Run `npm run watch-server  in the directory (in a different terminal emulator). This starts monitoring the file changes in the behaviors directory. As of now, there is only default directory, but I think people will make more directories for different worlds. The watch-server takes an extra argument to specify the directory, and specifying a directory will be a common pattern in development.

## 6. Press the Connect button in the world menu.
In one of the participants window, bring up the world menu from bottom left, and press "Connect". This will establish the connection to the watch-server started above item #5.

## 7 Edit or add a new file
You can simply add a new file in the watched directory (by default behaviors/default), and if the file follows the structure of other files, it will become automatically available.

