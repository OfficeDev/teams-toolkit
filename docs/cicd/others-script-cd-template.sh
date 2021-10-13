#!/usr/bin/env bash
set -euxo pipefail

# This is just an example workflow for continuous deployment.
# You should customize it to meet your own requirements.
# Also you should export the following environment variables for Azure/M365 login:
# export AZURE_ACCOUNT_NAME={AZURE_ACCOUNT_NAME}
# export AZURE_ACCOUNT_PASSWORD={AZURE_ACCOUNT_PASSWORD}
# export AZURE_SUBSCRIPTION_ID={AZURE_SUBSCRIPTION_ID}
# export AZURE_TENANT_ID={AZURE_TENANT_ID}
# export M365_ACCOUNT_NAME={M365_ACCOUNT_NAME}
# export M365_ACCOUNT_PASSWORD={M365_ACCOUNT_PASSWORD}

# To enable @microsoft/teamsfx-cli running in CI mode, turn on CI_ENABLED like below.
# In CI mode, @microsoft/teamsfx-cli is friendly for CI/CD. 
export CI_ENABLED=true

# Setup environment.
# Sufficient permissions are required to run the commands below.
apt install -y nodejs npm git

# Checkout the code.
# Update the placeholder of {RepositoryEndpoint} to your repository's endpoint.
git clone {RepositoryEndpoint}
# Update the placeholder of {FolderName} to your repository's folder name after git clone.
cd {FolderName}

# Install the local dev dependency of @microsoft/teamsfx-cli. 
# 'npm ci' is used here to install dependencies and it depends on package-lock.json.
# If you prefer to use 'npm ci', please make sure to commit package-lock.json first, or just change it to 'npm install'.
npm ci

# Build the project.
# The way to build the current project depends on how you scaffold it.
# Different folder structures require different commands set.
cd tabs && npm ci && npm run build

# Run unit test.
# Currently, no opinioned solution for unit test provided during scaffolding, so,
# set up any unit test framework you prefer (for example, mocha or jest) and update the commands accordingly in below.
npm run test

# We suggest to do the provision steps by case manually or in a separated workflow, so just comment the following steps for references.
# After provision, you should commit .fx/env.default.json into the repository for later use.
# You should pick required secrets from .fx/default.userdata, and export them in your environment which can be refered by the step with name 'Generate default.userdata'. 

# Provision hosting environment.
# npx teamsfx provision --subscription ${AZURE_SUBSCRIPTION_ID}

# Commit provision configs if necessary.
# git add .fx/env.default.json
# git commit -m "chore: commit provision configs"
# git push

# Generate default.userdata
[ ! -z "${USERDATA_CONTENT}" ] && echo "${USERDATA_CONTENT}" > .fx/default.userdata

# Deploy to hosting environment.
cd .. && npx teamsfx deploy

# This step is to pack the Teams App as zip file,
# which can be used to be uploaded onto Teams Client for installation.
# Build Teams App's Package.
npx teamsfx package

# Upload Teams App's Package as artifacts.
# Choose what your workflow/pipeline platform provided to
# upload appPackage/appPackage.zip as artifacts.

# Publish Teams App.
npx teamsfx publish
