#!/bin/bash

download () {
  sleep 1
  curl "https://cdn.sstatic.net/Sites/$1/img/404.$2" -o "$1.404.$2"
  sleep 1
  curl "https://cdn.sstatic.net/Sites/$1meta/img/404.$2" -o "$1meta.404.$2"
}

regex="https:\\/\\/([a-z]+)\\.stackexchange\\.com"
while read p; do
  if ! [[ $p =~ $regex ]];
  then continue
  fi
    
  name="${BASH_REMATCH[1]}"    
  if [[ $p == "bicycles" || $p == "gamedev" || $p == "mechanics" || $p == "webapps" || $p == "webmasters" ]]
  then extension="jpg"
  elif [[ $p == "datascience" ]]
  then extension="svg"
  else extension="png"
  fi
  download $name $extension
done < <(jq -r '.[] | .site_url' ~/workspace/SE-toolbox/sites.json)

# exceptions
download "askubuntu" "png"
download "beta" "png"
download "mathoverflow" "png"
# Meta Stack Exchange: see beta
# Meta Server Fault: see Meta Stack Overflow
curl "https://meta.stackoverflow.com/Content/Sites/stackoverflowmeta/img/keyboard-waffles.jpg" -o "stackoverflowmeta.404.jpg"
# Meta Super User: see Super User
curl "https://cdn.sstatic.net/Sites/serverfault/img/spaghetti-networking.jpg" -o "serverfault.404.jpg"
# Stack Apps: see Meta Stack Exchange
# Stack Overflow: https://stackoverflow.com/404, copy/paste SVG from source
curl "https://cdn.sstatic.net/Sites/superuser/img/it-kama-sutra.jpg" -o "superuser.404.jpg"