# The Property Sheet

[https://croquet.io](https://croquet.io)

## Introduction
The property sheet is an in-world interactive tool to edit properties of a card, delete or copy the card, and attach and detach available behavior modules. You can bring the property sheet on a card by Control-Click.

The property sheet has three parts. See A, B and C in the picture below.

<p align="center">
<img src="https://gist.githubusercontent.com/yoshikiohshima/45848af5a19dddbe1ea77f5d238fced0/raw/f808b6e65964e59da7e75a76085efe9d7054f5c8/propertySheet.png" width="400"/>
</p>

## The Property Value Pane

The part A shows the properties of the card. You can edit values, and add a new property. When you press Ctrl-S or Alt-S, the content is analyzed line by line and the properties of the card are updated.

Note that in some cases updated values may not take effects, depending on how the behaviors that use the value are written.

Also note that the text field does not automatically update.

## The Behaviors List Pane
The part B shows the list of user behavior modules that are available in the current system. It does not contain the system behavior modules.

You can select one or more behaviors from the list. When you press `apply` the selected ones are attached to the card, and unselected ones are detached. This causes the `setup()` method of newly attached behaviors are invoked, and the `teardown()` method of newly detached ones are invoked.

## The Action Pane
The part C contains three common actions. When `Duplicate` is pressed, the card is duplicated and placed near the original card.  Whew `Delete` is pressed, the card is deleted, along with the property sheet(s) associated with the card. When `Save` is pressed, the VRSE file for the card is created and downloaded. You can drag and drop the VRSE file into another space.
