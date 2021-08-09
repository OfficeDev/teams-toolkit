#!/bin/bash
if [[ -z "$(git tag --points-at HEAD | grep templates)" && ! -z "$(git diff HEAD^ -- ../../templates/package.json|grep version)" ]]
then
    echo "need to tag on templates cause templates has no tags but bump up version"
    git tag "templates@$(node -p "require('../../templates/package.json').version")"
fi