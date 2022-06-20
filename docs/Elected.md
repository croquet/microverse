# The View Election Mechanism in Croquet Microverse

[https://croquet.io](https://croquet.io)

## Introduction

It is sometimes useful to be able to "elect" one peer to take a certain action on its view side. For example, the elected view may fetch an external data stream from internet and feed data in the shared session for all peers.

The `behaviors/croquet/elected.js` module provides a generic way to elect one peer among the participants. It is expected be used with another behavior modules that actually takes an action (such as fetching data) based on the election result.  See examples in `behaviors/default/bitcoinTraker.js` and `behaviors/default/flightTracker.js`.

## The Actor-side Implementation

`ElectedActor` keeps track of all active views by handling the `view-join` and `view-exit` messages. The `views` property is a Set so that that retains the order of elements as they are added. We simply pick the first entry as the leader of the peers.

The actor-side of the client behavior that uses `Elected` does not have to have any code that is specific to the `Elected` mechanism. It will receive messages from the peer of one of the peers. The client actor will update its variables upon receiving an event, and request view update if necessary.

## The Pawn-side Implementation

The pawn-side of the client behavior needs to handle `handleEleted` and `handleUnelected` events sent from the `ElectedPawn`. The client pawn is expected to send the `electionStatusRequested` event in `setup()`. Upon receiving this event (it is a view to view event thus not replicated), the `ElectedPawn` sends `handleElected` event when the peer is the elected one in response.

The `handleElected` event does not have an argument when it was sent in response to `electionStatusRequested`. In other cases, when the former leader drops out and now the view becomes the leader, the event is sent with an object argument with `from` and `to` field.

The implementation of the handler for `handleElected` is expected to start its action when argument is `undefined` or its `to` field is the viewId of the peer.

**Copyright (c) 2022 Croquet Corporation**

