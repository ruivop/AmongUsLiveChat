# AmongUsLiveChat

In this project, I tried to create a kind of "Among Us Mod" only in the browser that allowed players to voice chat based on their positions.

# Features
 - Create a lobby where players can text and voice chat.
 - See chat bubbles of players talking.
 - In-game, voice chat with lobby players, based on distance (only hear someone if it is close) or dead state (live players can't hear dead players... but currently has issues)

# Requirements
This voice chat requires users to share the microphone.

To use the distance voice chat the users must share the screen or window with the game.

The microphone sound is sent to all players. The screen image is only used in the user computer, and its game position is sent to all players.

Since this uses OpenCV to analyze the screen frames, you should have a good computer.

# Details
It uses [WebRTC](https://webrtc.org/getting-started/media-devices) to create a "lobby" where people can talk.
It asks the player to share the screen (with the game) and then it uses [OpenCV](https://docs.opencv.org/3.4/d5/d10/tutorial_js_root.html) (with [match template](https://docs.opencv.org/4.5.2/d8/dd1/tutorial_js_template_matching.html)) to find each player position.
All the players share their position and can create a chat that lowers the volume of players depending on the distance from them.
A small "picture in picture" can be set to view the players talking.

## OpenCV and game state
Basically, to know a given player position the screen (with some filter applied) is matched against an image of the [entire map](https://github.com/ruivop/AmongUsLiveChat/blob/6bba3fffa80a7f3012120c12a31006752e5b086b/assets/Skeld20b.jpg).
If there is a match above a threshold the players' position is found.

When a player is doing a task it doesn't match against anything so the player position maintains.

To know when a player is killed it matches against the [dead screen](https://github.com/ruivop/AmongUsLiveChat/blob/6bba3fffa80a7f3012120c12a31006752e5b086b/assets/death-screen-corped-20.jpg), counts the time, and checks (also matches) for the existence of a following [voting screen](https://github.com/ruivop/AmongUsLiveChat/blob/6bba3fffa80a7f3012120c12a31006752e5b086b/assets/voting_screen.jpg).

False positives and a slow computer could be a problem.

# Run
To run this project just serve the files in this project in an HTTP server (like [this](https://www.npmjs.com/package/http-server)).

This needs a server to be the webrtc "[Signaling Channel](https://webrtc.org/getting-started/peer-connections)". The server is in [this](https://github.com/ruivop/amuswebrtcserver) repository and has a dockerfile. Don't use the docker-compose file.

For some connections, you need a [coturn server](https://github.com/coturn/coturn).

# Issues
Within Among Us, there are various states and state changes (a user can be in a menu, lobby, or in a game dead or alive, walking, doing a task, voting...).
I stopped developing this project because the was no trivial way to check who died by voting.
I can't read the dead player name, because it is outline text (Tesseract cant solve it, matching character to character probably won't solve it and it could be a problem with Asian characters).

If anyone can solve the problem please report.

This was only tested on google chrome and in the map "[The Skeld](https://among-us.fandom.com/wiki/The_Skeld)".

Also, this has not the concept of different lobbies, for now.
