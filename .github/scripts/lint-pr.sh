#!/bin/bash
VAR=$(git diff --diff-filter=MARC $1...HEAD --name-only --relative -- .| xargs)
echo $VAR
if [ ! -z "$VAR" ]
then 
    npx prettier --config .prettierrc.js --write $VAR --ignore-path .prettierignore
fi