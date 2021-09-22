#!/bin/bash
VAR=$(git diff --diff-filter=MARC -U0...origin/$1 --name-only --relative -- .| xargs)
echo $VAR
if [ ! -z "$VAR" ]
then 
    npx prettier --config .prettierrc.js --write $VAR --ignore-path .prettierignore
fi