#!/bin/bash
# Generate <script>.meta.js files containing only the script's metadata,
# so the whole script doesn't have to be downloaded to check for updates.
# Example use:
# // @updateURL   https://raw.githubusercontent.com/Charcoal-SE/Userscripts/master/fire/fire.meta.js
# // @downloadURL https://raw.githubusercontent.com/Charcoal-SE/Userscripts/master/fire/fire.user.js
awk '/./; /\/UserScript/ { exit }' "$1" > "${1/.user./.meta.}"
