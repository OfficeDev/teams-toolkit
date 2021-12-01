#!/bin/sh

result=`curl \
  -u :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 \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/OfficeDev/TeamsFx/actions/runs/1515397782/attempts/1/jobs`


failures=`echo $result | jq '.jobs[]| select(.name | contains("execute")) | select(.conclusion=="failure").name'`

mailbody=""

while IFS= read -r failure;
do 
    case=${failure:14:-1}
    file=`find tests/e2e -name $case".tests.ts"`
    email=`cat $file | grep '@author' | grep -i -o '[A-Z0-9._%+-]\+@[A-Z0-9.-]\+\.[A-Z]\{2,4\}'`
    echo $email
done <<< $failures
