# XRevent - Broadcaster

This Branch is used for the mediasoup testfiles
Alle these project can only be opened in LINUX!

JSPlayer-MS is the Clientside player.
JSStreamer-MS is the Artist-side streamer.
JSServer-MP is the NodeJS Server connecing the two.

## Getting started

ALL THESE STEPS ARE ONLY TESTED ON LINUX.
(and do not work on windows, mac may be possible with yarn).

Each part of the Stack is a bit different, but the initialisation is the same:

- Download the Repo and navigate to the folder of the part you want to edit.
- Open a console and type `npm i`

### Server

The server is started by typing `npm run dev`

### Player + Streamer

As the player/streamer is unsing Browserify you need to run `npm run pack` after editing the script.js before testing!
