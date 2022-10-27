# The Gizmo Interface

[https://croquet.io](https://croquet.io)

## Introduction
Croquet Microverse 0.1.15 introduced the "gizmo" interface to control the translation, rotation and scale of a card.

<p align="center">
<img src="./assets/gizmo-t.png" width="800"/>
</p>

When you click on a card while the control or alt key pressed down, you get a set of red, green and blue arrows (A) along with an icon of a tool called the property sheet (B) and the bounding box around the object (C), as shown in the above image. Note that the tools are rendered in front of all other objects in the scene.

Each of the arrows lets you drag the card in the direction of the arrow. Clicking on the property sheet icon brings up the Property Sheet tool (cf. PropertySheet.md).

When you control-click the object again while the arrows are showing, it switches to the rotation mode. There are red, green and blue rings, and dragging a ring (make sure that the one you intend to move gets yellow highlight) rotates the object around.

<p align="center">
<img src="./assets/gizmo-r.png" width="800"/>
</p>

Another click switches the mode to the scaling mode. Currently, all three boxes scale the card uniformly.

<p align="center">
<img src="./assets/gizmo-s.png" width="800"/>
</p>

The gizmo created by another participant is displayed in white. You cannot operate them but you can see that another user intends to manipualte it. If a user does not touch the gizmo for 15 seconds, the gizmo will be deleted by the system.

<p align="center">
<img src="./assets/gizmo-w.png" width="800"/>
</p>

**Copyright (c) 2022 Croquet Corporation**


