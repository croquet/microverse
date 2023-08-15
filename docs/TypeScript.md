# Writing Behaviors in TypeScript

[https://croquet.io](https://croquet.io)

## Introduction
You can write a Microverse Behavior in TypeScript and JavaScript. The auto-completion and showing doc strings works in certain text editors such as VS Code for both TS and JS.

A behavior file (such as `behaviors/default/bitcoinTracker.ts`) should start with a line:

```TypeScript
import {ActorBehavior, PawnBehavior} from "../PrototypeBehavior";
```

`PrototypeBehavior.d.ts defines types of the base object's methods and properties that are visible from a behavior.

You can write type definitions such as this (knowing that they are elided from the transpilied result):

```TypeScript
type History = {date: number, amount: number};
type BarMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
```

The definition of an actor behavior can use the `ActorBehavior` in this way:

```TypeScript
class BitcoinTrackerActor extends ActorBehavior {
```

However it is very important to understand that a behavior is not a class, and it does not extend ActorBehavior or CardActor. The `import` and `extends` are purely for helping the text editors to infer types in the program, and not to define the semantics of the defined behavior.

In a nutshell, a behavior definition is transported over the Croquet network so it has to be serializeable. That means that it cannot contain a pointer to an external object, including the superclass.

Another thing to know is that transpilation from TypeScript to JavaScript happens in the running Microverse session in the browser, not on your disk. Before the transpilation step, the import line is simply deleted as well as the part from the `extends` keyword.

The body of behavior can be written in a way you would expect. Basic features such as `subscribe' and 'publish` (and their short hand form `listen` and `say`) can have the type parameter to specify the data to be sent and you can match the type up with the receiving side.

```TypeScript
class BitcoinTrackerActor extends ActorBehavior {
    history: Array<History>;
    setup() {
        if (!this.history) {
            this.history = [{ date: 0, amount: 0 }];
        }
        this.listen<History>("BTC-USD", this.onBitcoinData);
        this.listen<Array<History>>("BTC-USD-history", this.onBitcoinHistory);
    }
```

Similarly, a pawn behavior can be written in the similar way:

```TypeScript
class BitcoinTrackerPawn extends PawnBehavior {
    lastAmount: number;
    socket: WebSocket;
    canvas: HTMLCanvasElement;
    texture: THREE.CanvasTexture;

    setup() {
        this.lastAmount = 0;
        this.listen<number>("value-changed", "onBTCUSDChanged");

        this.onBTCUSDChanged();

        // Those two messages are sent from the Elected module.
        // When handleElected is sent, it signifies that it newly becomes a leader.
        // When handleUnelected is sent, it signifies that it is not a leader anymore.
        this.listen("handleElected", "handleElected");
        this.listen("handleUnelected", "handleUnelected");

        // Upon start up, this message query the current status from the Elected module.
        this.say("electionStatusRequested");
    }
```

the `texture` and `canvas` properties are defined at the CardPawn class as this behavior expects to be installed to a card whose type is "2d" and textureType is "canvas".

When you select the "Connect" menu item from the three bar menu and edit a behavior file, the system detect the changes in file, load the changed file into the system, transpile it and distribute it to all participants in the session.

When you are writing code in JavaScript, you can still have the import line:

```JavaScript
import {ActorBehavior, PawnBehavior} from "../PrototypeBehavior";
```

and use the `extends` keyword:

```JavaScript
class LightPawn extends PawnBehavior {
```

Again a behavior does not actually inherit from `PawnBehavior` or `ActorBehavior` but your editor can look up the document strings.
