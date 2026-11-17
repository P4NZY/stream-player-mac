#!/bin/bash
# =============================================================================
# Stream Player for Mac - installer
#
# Run it once from Terminal:
#     bash <drag this file into the Terminal window>   then press Return
#
# What it does:
#   1. finds a browser that can play Spotify's songs (Google Chrome, Microsoft
#      Edge, Brave, Chromium or Vivaldi)
#   2. copies the player (a browser extension) to
#      ~/Library/Application Support/Stream Player/extension, and downloads
#      Spotify's and SoundCloud's own player scripts into it
#   3. makes "Stream Player" in your Applications folder (in your home folder),
#      with the player's icon: it opens the player in a window of its own,
#      with its own sign-in, separate from your normal browsing - and stays
#      open as long as the player is, so the Dock shows the dot under it
#   4. opens it
# Run it again after getting a newer version of this folder: it replaces the
# old files and keeps your sign-in and settings.
# =============================================================================
set -e

HERE="$(cd "$(dirname "$0")" && pwd)"
SUPPORT="$HOME/Library/Application Support/Stream Player"
PROFILE="$SUPPORT/Browser"
APP="$HOME/Applications/Stream Player.app"

say() { printf '%s\n' "$*"; }

if [ ! -f "$HERE/extension/manifest.json" ] || [ ! -f "$HERE/extension/player.html" ]; then
  say "The 'extension' folder is missing next to this script. Copy the whole 'Stream Player for Mac' folder and run it from there."
  exit 1
fi

# --- 1. a browser -------------------------------------------------------------
BROWSER_APP=""
for name in "Google Chrome" "Microsoft Edge" "Brave Browser" "Chromium" "Vivaldi"; do
  for dir in "/Applications" "$HOME/Applications"; do
    if [ -d "$dir/$name.app" ]; then BROWSER_APP="$dir/$name.app"; break 2; fi
  done
done
if [ -z "$BROWSER_APP" ]; then
  say ""
  say "Stream Player plays your music through Google Chrome (or Microsoft Edge or Brave),"
  say "and none of them is installed. Opening the Chrome download page:"
  say "install Chrome, then run this installer again."
  open "https://www.google.com/chrome/"
  exit 1
fi
say "Browser:   $BROWSER_APP"

# --- 2. the player ------------------------------------------------------------
mkdir -p "$SUPPORT"

# A player that is open still runs the old files: it closes first (the music
# stops; it opens again at the end).
player_pids() {
  local p c
  for p in $(pgrep -f -- "--user-data-dir=$PROFILE( |\$)" 2>/dev/null); do
    c="$(ps -o comm= -p "$p" 2>/dev/null)"
    case "$c" in */Frameworks/*) ;; *.app/Contents/MacOS/*) echo "$p" ;; esac
  done
}
OPEN_PIDS="$(player_pids)"
if [ -n "$OPEN_PIDS" ]; then
  say "Closing the player for the update..."
  kill -TERM $OPEN_PIDS 2>/dev/null || true
  for i in $(seq 1 40); do [ -z "$(player_pids)" ] && break; sleep 0.25; done
fi
pkill -f "$APP/Contents/MacOS/applet" 2>/dev/null || true   # (the app, if it is still open)

# (the services' own scripts from the last install, in case they cannot be
#  downloaded this time - see below)
OLD_LIB="$(mktemp -d)"
cp "$SUPPORT/extension/lib/"*.js "$OLD_LIB/" 2>/dev/null || true
rm -rf "$SUPPORT/extension"
cp -R "$HERE/extension" "$SUPPORT/extension"
xattr -dr com.apple.quarantine "$SUPPORT/extension" 2>/dev/null || true

# Spotify's and SoundCloud's own scripts (see extension/lib/ABOUT.txt) come
# straight from Spotify and SoundCloud, so the player has their current ones
# (and this folder does not pass copies of them around).
mkdir -p "$SUPPORT/extension/lib"
fetch_lib() {   # fetch_lib <file> <address> <a word the real file has in it>
  local dest="$SUPPORT/extension/lib/$1" tmp
  tmp="$(mktemp)"
  if curl -fsSL --max-time 40 -o "$tmp" "$2" 2>/dev/null && grep -q "$3" "$tmp"; then
    mv "$tmp" "$dest"
    return 0
  fi
  rm -f "$tmp"
  if [ -s "$OLD_LIB/$1" ]; then
    cp "$OLD_LIB/$1" "$dest"
    say "(could not download $1 just now: the copy from the last install stays)"
    return 0
  fi
  if [ -s "$HERE/extension/lib/$1" ]; then return 0; fi
  return 1
}
if ! fetch_lib spotify-player.js "https://sdk.scdn.co/spotify-player.js" "onSpotifyWebPlaybackSDKReady" ||
   ! fetch_lib sc-widget-api.js "https://w.soundcloud.com/player/api.js" "Widget"; then
  say "Could not download Spotify's and SoundCloud's player scripts - is the Mac online?"
  say "Run install.sh again once it is."
  rm -rf "$OLD_LIB"
  exit 1
fi
rm -rf "$OLD_LIB"
# Which browser, for the app. (Not in a file called "browser": to a Mac's disk
# that is the same name as the profile folder "Browser" - capitals do not count.)
printf '%s\n' "$BROWSER_APP" > "$SUPPORT/browser-app"
mkdir -p "$PROFILE"
say "Player:    $SUPPORT/extension"

# --- 3. the app ---------------------------------------------------------------
# "Stream Player" is a small AppleScript app (osacompile comes with macOS). It
# starts the player's browser (player.sh, inside the app, does that side) and
# then stays open for as long as that browser runs, so the Dock shows the dot
# under it like under any open app.
mkdir -p "$HOME/Applications"
rm -rf "$APP"
WORK="$(mktemp -d)"

# icon, from the picture in the extension folder (sips and iconutil come with macOS)
ICONSET="$WORK/AppIcon.iconset"
mkdir -p "$ICONSET"
for s in 16 32 128 256 512; do
  sips -z "$s" "$s" "$HERE/extension/icon.png" --out "$ICONSET/icon_${s}x${s}.png" >/dev/null 2>&1 || true
  d=$((s * 2))
  sips -z "$d" "$d" "$HERE/extension/icon.png" --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null 2>&1 || true
done
iconutil -c icns "$ICONSET" -o "$WORK/AppIcon.icns" 2>/dev/null || say "(could not make the app icon; the app works without it)"

cat > "$WORK/Stream Player.applescript" <<'OSA'
-- Stream Player: the app in the Applications folder, and in the Dock.
--
-- It opens the player - a browser window with the player, in a browser profile
-- of its own (player.sh, next to this script in the app, does the browser
-- side) - and then stays open for as long as the player's browser runs, so the
-- Dock shows the dot under Stream Player, as under any open app.
--   clicking Music Player in the Dock, or picking it with Cmd + Tab:
--       the player comes to the front (opened again if its window was closed)
--   quitting Stream Player (right-click it in the Dock): the player quits too
--   quitting the player (Cmd + Q in its window):         Stream Player goes too
use AppleScript version "2.4"
use framework "Foundation"
use framework "AppKit"
use scripting additions

property playerPid : 0 -- the player's browser (0: not known to run)
property lastBring : 0 -- when the player was last brought to the front

on run
	set playerPid to 0
	set lastBring to 0
	bringPlayer()
	-- picked with Cmd + Tab (a click in the Dock comes as "reopen" as well)
	try
		current application's NSNotificationCenter's defaultCenter()'s addObserver:me selector:"becameActive:" |name|:(current application's NSApplicationDidBecomeActiveNotification) object:(missing value)
	end try
end run

on reopen
	bringPlayer()
end reopen

on becameActive:aNotification
	-- (only a click on Stream Player itself starts the player again: when the
	--  player quits, the Mac may make this app the active one for a moment)
	if playerRunning() then
		bringPlayer()
	else
		quit
	end if
end becameActive:

on idle
	if not playerRunning() then quit
	return 2
end idle

on quit
	try
		if playerRunning() then do shell script "kill -TERM " & playerPid -- (the browser closes as on Cmd + Q)
	end try
	continue quit
end quit

on helper(what)
	return do shell script "/bin/bash " & quoted form of (POSIX path of (path to me) & "Contents/Resources/player.sh") & " " & what
end helper

on secondsNow()
	return (current application's NSDate's timeIntervalSinceReferenceDate()) as real
end secondsNow

on playerRunning()
	if playerPid is not 0 then
		set theApp to current application's NSRunningApplication's runningApplicationWithProcessIdentifier:playerPid
		if theApp is not missing value then
			if not ((theApp's isTerminated()) as boolean) then return true
		end if
	end if
	set p to ""
	try
		set p to helper("pid")
	end try
	if p is "" then
		set playerPid to 0
		return false
	end if
	set playerPid to p as integer
	return true
end playerRunning

on bringPlayer()
	-- (a click in the Dock arrives twice - as "reopen" and as this app becoming active)
	if secondsNow() - lastBring < 1.5 then return
	set lastBring to secondsNow()
	if not playerRunning() then
		set p to ""
		try
			set p to helper("start") -- prints the browser's process id once it runs
		end try
		if p is "" then
			quit -- (it could not start; player.sh has said why)
		else
			set playerPid to p as integer
		end if
	else
		if shownWindows() is 0 then
			-- minimized, hidden, on another desktop, or closed: ask the browser
			-- for the player again; its extension brings back the window it has
			try
				helper("show")
			end try
		end if
		set theApp to current application's NSRunningApplication's runningApplicationWithProcessIdentifier:playerPid
		if theApp is not missing value then
			try
				current application's NSApplication's sharedApplication()'s yieldActivationToApplication:theApp
			end try
			try
				theApp's unhide()
				theApp's activateWithOptions:(current application's NSApplicationActivateAllWindows)
			end try
		end if
	end if
	set lastBring to secondsNow()
end bringPlayer

on shownWindows()
	-- the player's windows on the screen now (the browser's own little helper windows aside)
	try
		return (run script "ObjC.import('CoreGraphics');
var list = ObjC.castRefToObject($.CGWindowListCopyWindowInfo($.kCGWindowListOptionOnScreenOnly | $.kCGWindowListExcludeDesktopElements, 0)), n = 0;
for (var i = 0; i < list.count; i++) {
  var w = list.objectAtIndex(i), b = w.objectForKey('kCGWindowBounds');
  if (w.objectForKey('kCGWindowOwnerPID').intValue == " & playerPid & " && w.objectForKey('kCGWindowLayer').intValue == 0 &&
      w.objectForKey('kCGWindowAlpha').doubleValue > 0 && b.objectForKey('Width').intValue >= 150 && b.objectForKey('Height').intValue >= 100) n++;
}
n" in "JavaScript") as integer
	on error
		return 0
	end try
end shownWindows
OSA
if ! OSA_OUT="$(osacompile -s -o "$APP" "$WORK/Stream Player.applescript" 2>&1)"; then
  say "Could not make the app (osacompile failed): $OSA_OUT"
  rm -rf "$WORK"
  exit 1
fi

# its own icon, name and id
PLIST="$APP/Contents/Info.plist"
if [ -f "$WORK/AppIcon.icns" ]; then
  cp "$WORK/AppIcon.icns" "$APP/Contents/Resources/applet.icns"
  rm -f "$APP/Contents/Resources/Assets.car"
  plutil -remove CFBundleIconName "$PLIST" 2>/dev/null || true
fi
plutil -replace CFBundleIdentifier -string "local.streamplayer.launcher" "$PLIST"
plutil -replace CFBundleName -string "Stream Player" "$PLIST"
plutil -replace CFBundleDisplayName -string "Stream Player" "$PLIST"
plutil -replace CFBundleShortVersionString -string "1.0" "$PLIST"
plutil -replace CFBundleVersion -string "1.0" "$PLIST"

# the browser side
{
  printf '#!/bin/bash\nSUPPORT=%q\n' "$SUPPORT"
  cat <<'HELPER'
# The browser side of the Stream Player app (see main.scpt in the app):
#   player.sh pid     the process id of the player's browser, if it runs
#   player.sh start   starts it - the player in a window of its own, with a
#                     browser profile of its own - and prints its process id
#   player.sh show    asks the running browser for the player again (its
#                     extension brings back the window it has, if it has one)
EXT="$SUPPORT/extension"
PROFILE="$SUPPORT/Browser"
BROWSER_APP="$(head -n 1 "$SUPPORT/browser-app" 2>/dev/null)"
# The player is a page of the extension. The id of an extension loaded from a
# folder comes from the folder's path; the player's address comes from the id.
EXT_ID="$(printf '%s' "$(cd "$EXT" 2>/dev/null && pwd -P)" | shasum -a 256 | cut -c1-32 | tr '0-9a-f' 'a-p')"
URL="chrome-extension://$EXT_ID/player.html"
EXE="$BROWSER_APP/Contents/MacOS/$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$BROWSER_APP/Contents/Info.plist" 2>/dev/null)"

player_pid() {
  local p
  for p in $(pgrep -f -- "--user-data-dir=$PROFILE( |\$)"); do
    if [ "$(ps -o comm= -p "$p" 2>/dev/null)" = "$EXE" ]; then echo "$p"; return 0; fi
  done
  return 1
}

case "$1" in
pid)
  player_pid
  ;;
start)
  if [ ! -d "$BROWSER_APP" ] || [ ! -x "$EXE" ] || [ ! -f "$EXT/manifest.json" ]; then
    osascript -e 'display alert "Stream Player" message "Something it needs has moved or been removed (the browser, or the player files). Run install.sh from the Stream Player for Mac folder again." as critical' >/dev/null 2>&1
    exit 0
  fi
  if player_pid; then exit 0; fi
  mkdir -p "$PROFILE"

  # Brave plays Spotify's (protected) songs only once Widevine is switched on,
  # and asks about that in its ordinary windows - which the player's is not.
  # So the player's profile starts with it on, and with the Widevine files of
  # the everyday Brave if there are any (saving the download).
  if [ ! -e "$PROFILE/Local State" ]; then
    case "$BROWSER_APP" in
      *Brave*)
        printf '{"brave":{"widevine_opted_in":true}}\n' > "$PROFILE/Local State"
        W="$HOME/Library/Application Support/BraveSoftware/Brave-Browser/WidevineCdm"
        if [ -d "$W" ] && [ ! -e "$PROFILE/WidevineCdm" ]; then cp -R "$W" "$PROFILE/WidevineCdm" 2>/dev/null || true; fi
        ;;
    esac
  fi

  # (--autoplay-policy: without it the browser may refuse to start a song that
  #  was not started by a click on the page itself - next / previous from the
  #  keyboard's media keys, say)
  # (--allowlisted-extension-id: lets the visualizer hear the music without a
  #  click on the extension's toolbar button first - which the player's window
  #  does not have)
  # (--test-type: without it the browser puts a warning bar about that switch,
  #  "unsupported command-line flag", across the top of the window at every
  #  start. It changes nothing else the player uses.)
  ARGS=(--user-data-dir="$PROFILE" --no-first-run --no-default-browser-check --autoplay-policy=no-user-gesture-required
        --load-extension="$EXT" --allowlisted-extension-id="$EXT_ID" --test-type --app="$URL")

  # The first time, the extension may still have to be switched on in this
  # profile by hand: Google Chrome (since version 137) ignores --load-extension.
  # Edge, Brave and the others still take it, so they only get the directions if
  # it did not work the first time.
  NEED_HAND=""
  if ! grep -qsF "$EXT" "$PROFILE/Default/Secure Preferences" "$PROFILE/Default/Preferences"; then
    case "$BROWSER_APP" in
      *"Google Chrome"*) NEED_HAND=1 ;;
      *) if [ -f "$PROFILE/Stream Player started" ]; then NEED_HAND=1; fi ;;
    esac
  fi
  touch "$PROFILE/Stream Player started"
  if [ -n "$NEED_HAND" ]; then
    ARGS+=("chrome://extensions/")
    osascript >/dev/null 2>&1 <<'DIALOG' &
display dialog "One-time setup, about a minute:

1. In the Extensions window that opens, switch on  Developer mode  (top right).

2. Click  Load unpacked.

3. Press  Cmd + Shift + G , paste this, press Return, then click  Select :

~/Library/Application Support/Stream Player/extension

4. Close the Extensions window and press  Cmd + R  in the Stream Player window.

Then connect Spotify and SoundCloud there (the player shows how). You only do this once." buttons {"OK"} default button 1 with title "Stream Player"
DIALOG
  fi

  open -na "$BROWSER_APP" --args "${ARGS[@]}"
  for i in $(seq 1 120); do
    sleep 0.25
    if player_pid; then exit 0; fi
  done
  ;;
show)
  if player_pid >/dev/null; then
    "$EXE" --user-data-dir="$PROFILE" --test-type --app="$URL#mp-show" >/dev/null 2>&1 &
  fi
  ;;
esac
exit 0
HELPER
} > "$APP/Contents/Resources/player.sh"
chmod +x "$APP/Contents/Resources/player.sh"
rm -rf "$WORK"

# (signed again after the changes above - "ad hoc", no developer account needed -
#  and the Mac told about the new app, so the Dock shows it as it is now)
codesign --force --sign - "$APP" >/dev/null 2>&1 || true
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP" >/dev/null 2>&1 || true
touch "$APP"
say "App:       $APP"

say ""
say "Done. Stream Player is in the Applications folder in your home folder"
say "(Finder > Go > Home > Applications), and in Launchpad and Spotlight."
say "Drag it to your Dock to keep it handy: while the player is open it has"
say "the dot under it, like any open app."
say ""
say "Opening it now..."
open -R "$APP" || true
open "$APP"
