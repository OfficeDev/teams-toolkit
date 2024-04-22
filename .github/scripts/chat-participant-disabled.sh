#!/bin/bash
filePath=packages/vscode-extension/src/chat/consts.ts
echo "Replace placeholders in $filePath"
sed -i -e "s@const IsChatParticipantEnabled = true@const IsChatParticipantEnabled = false@g" $filePath
echo "Replace Done."
