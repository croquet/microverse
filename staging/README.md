# Croquet Microverse Builder
## README

**Copyright (c) 2022 Croquet Corporation**

<https://croquet.io>

<info@croquet.io>

Please refer to the QuickStart.md in the `docs` directory to get started. Key concepts and the features of Croquet Microverse and development workflow are explained in other documents in `docs`. The following is the bare minimum steps to take to run Croquet Microverse on your computer:


## The First Steps to Run
1. Clone or fork the Github repository from <https://github.com/croquet/microverse-builder>.
    <br>`git clone git@github.com:croquet/microverse-builder.git` 
2. Obtain your Croquet API Key from <https://croquet.io/keys/>.
3. Open a terminal and change the working directory to your new Microverse-Builder folder.
   <br>`cd microverse-builder`
4. Create the apiKey.js file from apiKey.js-example and the API Key above.
   <br>`cp apiKey.js-example apiKey.js # and edit apiKey.js`
 
5. In the terminal run 

```npm i```

and then

```npm start```

6. Open browser at `localhost:9684` and enter a new world.

7. Copy the URL shown in the browser tab and copy it into a new tab. Also, replace localhost with the IP address (probably something like 192.168.0.123) and open it from another device on the local network.
