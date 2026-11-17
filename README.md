# Stream Player

A retro hi-fi player for Spotify and SoundCloud on Mac: the Winamp-style deck with Japanese labels from [Winapp Apple Music Skin](https://github.com/P4NZY/Winapp-apple-music-skin), with a switch at the top to flip between the two services. It opens in a window of its own and sits in the Dock like any app.

Unofficial, not made by or affiliated with Spotify or SoundCloud. Playing Spotify needs Spotify Premium.

## Features

- **The switch:** SPOTIFY ⇄ SOUNDCLOUD in the top strip (or Ctrl+S). Library, search, deck and queue flip over; whatever was playing on the other service pauses, and each keeps its own queue and place.
- **Deck:** time display, level meter, transport keys and volume across the top.
- **Library:**
  - Spotify: Liked Songs, saved albums, followed artists and your playlists. Saving songs, albums and playlists, adding to a playlist and making a new one change your Spotify account, so they show up in Spotify's own apps too.
  - SoundCloud: your public likes (from your profile link), plus playlists you make and songs, playlists, albums and artists you save, kept on this Mac.
- **Search:**
  - Spotify: the whole catalog plus your library.
  - SoundCloud: pasted links plus your library. A "Browse SoundCloud" window covers the rest: open a song, playlist or artist there and play or save it here with one click.
- **Visualizer panel:** 15 WebGL effects that move with the music.
- **Lyrics panel** that follows the song (from [LRCLIB](https://lrclib.net)).
- **Queue panel.** With shuffle on, the song you click plays first and the rest is shuffled after it.
- **Your own playlist order:** drag playlists, or use Alt+↑ / Alt+↓. RESET goes back to the service's order.
- **18 colour themes**, including Hatsune Miku, Kasane Teto and Ado, and **Album cover**, whose colours come from the cover of the song playing.
- **Themes of your own:** colours, lettering, and pictures (a photo, a moving GIF or a short video) behind the whole player or behind each part of it, framed by dragging. EXPORT saves a theme as one `.mpskin` file, which the Apple Music player opens too, and the other way round.
- **Compact player** (Ctrl+M) that floats above every other window, whatever app is in front.

## Install

Needs a Mac with Google Chrome, Microsoft Edge or Brave, online while installing (the installer downloads Spotify's and SoundCloud's player scripts).

1. Download this repository (**Code → Download ZIP**) and extract it.
2. Open Terminal, type `bash ` (with a space), drag `install.sh` into the window and press Return.
3. Stream Player opens. With Edge or Brave it is ready straight away. Chrome no longer loads extensions from the command line, so the first time the installer opens Chrome's Extensions page with directions for switching it on (Load unpacked).
4. ACCOUNT, bottom left, walks you through connecting the service the switch is set to.

`READ ME FIRST.txt` has the details: updating, the Dock app, what to do if something goes wrong.

## Spotify

Spotify only lets players like this one in through an app of your own, made once (free) on [Spotify's developer dashboard](https://developer.spotify.com/dashboard):

1. **Create app.** Any name. Redirect URI: `http://127.0.0.1:43117/spotify`.
2. Tick **Web API** and **Web Playback SDK**, then save.
3. Paste the app's **Client ID** into the player, press CONNECT, and sign in on Spotify's own page.

Nothing is stored anywhere but the player's browser profile on your Mac. Sign-in uses PKCE, so there is no client secret.

Spotify's rules as of 2026:

- The app only works while its owner has Premium.
- Other players only see the songs of playlists that are your own. Other playlists still play (PLAY or SHUFFLE), and the queue fills in as they go.
- An artist's page has albums and singles but no top songs.
- The sign-in has to be renewed every six months.

While the player is open it is a Spotify Connect device called "Stream Player".

## SoundCloud

SoundCloud's API (search, your own account's library) is only open to apps registered by Artist Pro subscribers, and its website's inner workings are not for other players to use. What SoundCloud offers every site is its embeddable player and the [Widget API](https://developers.soundcloud.com/docs/api/html5-widget) that drives it, and that is what plays here. So there is nothing to sign in to:

- Every public song, playlist, album and artist plays.
- Go+ songs play as 30-second previews, as they do for anyone signed out.
- Links get their title and picture from SoundCloud's oEmbed service.

## Keys

| Key | What it does |
| --- | --- |
| Ctrl+S | Spotify / SoundCloud |
| Ctrl+M | compact / full player |
| / | search |
| Space | play / pause |
| Backspace | back |
| Z X C V B | previous, play, pause, stop, next |
| G, L, Q | visualizer, lyrics, queue |
| [ and ] | change effect |
| F | visualizer fills the window |
| Alt+↑ / Alt+↓ | move the selected playlist |

## Changing it

Everything is in `extension/`. After a change, run `install.sh` again: it copies `extension/` into `~/Library/Application Support/Stream Player` and remakes the app.

| What | Files |
| --- | --- |
| The interface | `player.js` and `player.css` come from the Apple Music player's skin ([Winapp Apple Music Skin](https://github.com/P4NZY/Winapp-apple-music-skin), `app/ui/`), through `tools/convert-skin.py`: `python3 tools/convert-skin.py <that repo>/app/ui/player.js extension/player.js`. Run it again to bring in what changed there; changes of Stream Player's own go into that script. Stream Player's own styles are in `stream.css`. |
| The services | `services/engine.js` is a player shaped like Apple's MusicKit, which is what the interface was written for. `services/spotify.js` and `services/soundcloud.js` plug into it and bring the library. `services/common.js` handles sign-in (OAuth with PKCE) and building the queue. |
| Lyrics | `lyrics.js` |
| Visualizer sound | `background.js` and `offscreen.js`: the extension listens to the player's own window and passes the sound on. |
| The page | `player.html` and `boot.js` load the page; `host.js` connects it to the browser (window size for the compact player, the title bar colour). |
| Spotify's and SoundCloud's own scripts | `lib/`. `install.sh` downloads them from Spotify and SoundCloud each time it runs; they are not kept in this repository. See `lib/ABOUT.txt`. |

## How it works

- **The page:** the player is a page of a browser extension (`player.html`), not an overlay on someone else's site, so both services live in one window and the switch flips between them without reloading.
- **Spotify:** the Web API brings the library, and the Web Playback SDK plays: Spotify's own player, in a hidden frame.
- **SoundCloud:** its embeddable player plays, also hidden, one song at a time, in the player's own queue.
- **The visualizer:** Spotify's songs are copy-protected and the page can't hear them. So the extension captures the window's sound (`chrome.tabCapture`), plays it on to the speakers and passes it to the visualizer and the level meter. It does this without a toolbar click, because the app starts the browser with `--allowlisted-extension-id`.
- **The app:** `install.sh` builds Stream Player as a small stay-open AppleScript app. It opens the player in a Chromium app window with its own profile (for Brave it switches Widevine on, which Spotify needs), and stays open while the player does, so the Dock shows the dot under it.

App icon: Kasane Teto art by LeafyyXD.
