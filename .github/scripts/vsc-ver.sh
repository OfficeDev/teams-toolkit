#!/bin/bash
SCRIPT_DIR=$(cd $(dirname "${BASH_SOURCE[0]}") && pwd)
REPO_ROOT_DIR=$(cd $SCRIPT_DIR/../.. && pwd)
VSC_DIR=$(cd $REPO_ROOT_DIR/packages/vscode-extension && pwd)
VSC_PACKAGE_JSON_DIR=$VSC_DIR/package.json
VSC_VER=$(jq -r .version $VSC_PACKAGE_JSON_DIR)
# get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
# get minor version
MINOR_VER=$(echo $VERSION|awk -F. '{print $2}')
# judge minor version on pre is odd, on main is even.
if [ $((MINOR_VER%2)) -eq 0 ] && [ "$CURRENT_BRANCH" == 'main' ]; then
echo "No need to bump up version on main branch with even minor version"
exit 0;
fi
if [ $((MINOR_VER%2)) -eq 1 ] && [ "$CURRENT_BRANCH" == 'prerelease' ]; then
echo "No need to bump up version on prerelease branch with odd minor version"
exit 0;
fi
#otherwise, bump up minor version, and set patch version start from 0.
VERSION=$(echo $VERSION | awk -F. '/[0-9]+\./{$2++;$3=0;print}' OFS=.)
# update the package.json file
jq '.version=$VERSION' $VSC_PACKAGE_JSON_DIR > tmp.$$.json
mv tmp.$$.json $VSC_PACKAGE_JSON_DIR
git add $VSC_PACKAGE_JSON_DIR
git commit -m "build: bump up version on vsc to meet the release process"