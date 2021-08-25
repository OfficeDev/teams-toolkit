#!/bin/bash
if [[ $1 == 'templates' ]]; then
    if [[ $SkipSyncup == *"template"* ]]; then
        echo "skip sync up templates version with sdk version"
    elif [[ -z "$(git tag --points-at HEAD | grep templates)" && ! -z "$(git diff HEAD^ -- ../../templates/package.json|grep version)" ]]
    then
        echo "need to tag on templates cause templates has no tags but bump up version"
        git tag "templates@$(node -p "require('../../templates/package.json').version")"
    fi
elif [[ $1 == 'fx-core' ]]; then
    if [[ $SkipSyncup == *"fx-core"* ]]; then
        echo "skip sync up fx-core version with simpleauth version"
    elif [[ -z "$(git tag --points-at HEAD | grep @microsoft/teamsfx-core)" && ! -z "$(git diff HEAD^ -- ../fx-core/package.json|grep version)" ]]
    then
        echo "need to tag on fx-core cause fx-core has no tags but bump up version"
        git tag "@microsoft/teamsfx-core@$(node -p "require('../fx-core/package.json').version")"
    fi
fi