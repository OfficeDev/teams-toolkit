#!/bin/bash
VAR=$(git diff -U0 origin/$1 --name-only -- . | cut -c $2- | xargs)
echo $VAR
if [ ! -z "$VAR" ]
then 
    npx prettier --config .prettierrc.js --write $VAR --ignore-path .prettierignore
fi