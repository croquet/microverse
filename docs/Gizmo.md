# The Gizmo Interface

[https://croquet.io](https://croquet.io)

## Introduction
Croquet Microverse 0.1.15 introduced the "gizmo" interface to control the translation, rotation and scale of a card.

<p align="center">
<img src="https://gist.githubusercontent.com/yoshikiohshima/45848af5a19dddbe1ea77f5d238fced0/raw/e4d8c4851bb341421c292beb28a4e7f78b049316/gizmo-t.png" width="800"/>
</p>

When you click on a card while the control or alt key pressed down, you get a set of red, green and blue arrows (A) along with a gray sphere (B), as shown in the above image.

Each of the arrows lets you drag the card in the direction of the arrow.  The clicking on the gray sphere brings up the property sheet (cf. PropertySheet.md).

When you Control-click the object again, they switch to the rotation mode. There are red, green and blue rings, and dragging a ring (make sure that the one you intend to move gets yellow highlight) rotates the object around.

<p align="center">
<img src="https://gist.githubusercontent.com/yoshikiohshima/45848af5a19dddbe1ea77f5d238fced0/raw/e4d8c4851bb341421c292beb28a4e7f78b049316/gizmo-r.png" width="800"/>
</p>

Another click switches the mode to the scaling mode. Currently, all three boxes scale the card uniformly.

<p align="center">
<img src="https://gist.githubusercontent.com/yoshikiohshima/45848af5a19dddbe1ea77f5d238fced0/raw/e4d8c4851bb341421c292beb28a4e7f78b049316/gizmo-s.png" width="800"/>
</p>

The gizmo created by another participant is displayed in white. You cannot operate them but you can see that another user intends to manipualte it. If a user does not touch the gizmo for 15 seconds, the gizmo will be deleted by the system.

<p align="center">
<img src="https://gist.githubusercontent.com/yoshikiohshima/45848af5a19dddbe1ea77f5d238fced0/raw/e4d8c4851bb341421c292beb28a4e7f78b049316/gizmo-w.png" width="800"/>
</p>

**Copyright (c) 2022 Croquet Corporation**


