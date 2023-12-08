## Observer

This directory contains code related to running the Q Game with a GUI.

It contains

- `observer.ts` which has the following
  - `Observer`, the interface for the referee to update the observer's game state and inform it of when a game is over.
  - `ObserverAPI` an interface for the GUI to control the observers state, and save the current state.
  - `BaseObserver` a base class for the GUI and Referee that implements both `ObserverAPI` and `Observer`.
