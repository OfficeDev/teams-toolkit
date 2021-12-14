#!/bin/bash
VAR=$(git diff --diff-filter=MARC $1...HEAD --name-only --relative -- .| grep -E '.js$|.ts$|.jsx$|.tsx$' | xargs)
echo $VAR
if [ ! -z "$VAR" ]
then 
    npx eslint $VAR --quiet --fix
fi

git diff --diff-fileter=MARC $1...HEAD --name-only >> .github/detect-pattern/include-patterns.txt