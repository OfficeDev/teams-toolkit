#!/bin/bash
VAR=$(git diff --diff-filter=MARC $1...HEAD --name-only --relative -- .| grep -E '.js$|.ts$|.jsx$|.tsx$' | xargs)
echo $VAR
if [ ! -z "$VAR" ]
then 
    npx eslint --quiet --fix $VAR
fi

VAR2=$(git diff --diff-filter=MARC $1...HEAD --name-only --relative -- .| grep -E '.yml.tpl$|.yaml.tpl$' | xargs)
echo $VAR2
if [ ! -z "$VAR2" ]
then
    yamllint $VAR2
fi