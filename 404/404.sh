#!/bin/bash
regex="https:\\/\\/([a-z]+)\\.stackexchange\\.com\\/"
while read p; do
  if [[ $p =~ $regex ]]
  then
    name="${BASH_REMATCH[1]}"
    curl "https://cdn.sstatic.net/Sites/$name/img/404.png" -o "$name.404.png"
    name="${BASH_REMATCH[1]}meta"
    curl "https://cdn.sstatic.net/Sites/$name/img/404.png" -o "$name.404.png"
  fi
done < ~/Dropbox/stack-exchange-sites.txt