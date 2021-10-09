#!/bin/bash
VAR=$(git diff --diff-filter=MARC $1...HEAD --name-only --relative -- .| grep -E '.js$|.ts$|.jsx$|.tsx$' | xargs)
echo $VAR
if [ ! -z "$VAR" ]
then 
    # npx prettier --config .prettierrc.js --write $VAR --ignore-path .prettierignore
    npx eslint $VAR --quiet --fix
fi