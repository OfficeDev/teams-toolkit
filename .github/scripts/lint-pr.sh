#!/bin/bash
VAR=$(git diff --name-only HEAD origin/$1 -- . | cut -c $2- | xargs)
echo $VAR
if [ ! -z "$VAR" ]
then 
    npx prettier --config .prettierrc.js --write $VAR --ignore-path .prettierignore
fi