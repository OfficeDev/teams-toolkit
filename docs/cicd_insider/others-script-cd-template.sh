#!/usr/bin/env bash
set -euxo pipefail

# This is just an example workflow for continuous deployment.
# You should customize it to meet your own requirements.
# export AZURE_SUBSCRIPTION_ID={AZURE_SUBSCRIPTION_ID}
# export SP_NAME={AZURE_SERVICE_PRINCIPAL_NAME}
# export SP_PASSWORD={AZURE_SERVICE_PRINCIPAL_PASSWORD}
# export TENANT_ID={AZURE_TENANT_ID}
# export M365_ACCOUNT_NAME={M365_ACCOUNT_NAME}
# export M365_ACCOUNT_PASSWORD={M365_ACCOUNT_PASSWORD}

# To enable M365 account login by non-interactive mode, turn on `CI_ENABLED` by `export CI_ENABLED=true`.
export CI_ENABLED=true

# To specify the env name for multi-env feature.
export TEAMSFX_ENV_NAME=staging

# Setup environment.
# Sufficient permissions are required to run the commands below.
# The following command is expected to run on Ubuntu 16.04 or newer versions, and please adapt it if necessary.
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
cd tabs && npm ci && npm run build && cd -

# Run unit test.
# Currently, no opinioned solution for unit test provided during scaffolding, so,
# set up any unit test framework you prefer (for example, mocha or jest) and update the commands accordingly in below.
cd tabs && npm run test && cd -

# Set for non-interactive mode.
npx teamsfx config set -g interactive false

# Login Azure by service principal
npx teamsapp auth login azure --service-principal --username ${SP_NAME} --password ${SP_PASSWORD} --tenant ${TENANT_ID}

# We suggest to do the provision steps by case manually or in a separated workflow, so just comment the following steps for references.
# After provisioning, you should commit necessary files under .fx into the repository.

# Provision hosting environment.
# npx teamsfx provision --subscription ${AZURE_SUBSCRIPTION_ID} --env ${TEAMSFX_ENV_NAME}

# Commit provision configs if necessary.
# git add .fx
# git commit -m "chore: commit provision configs"
# git push

# Deploy to hosting environment.
npx teamsfx deploy --env ${TEAMSFX_ENV_NAME}

# This step is to pack the Teams App as zip file,
# which can be used to be uploaded onto Teams Client for installation.
# Build Teams App's Package.
npx teamsfx package --env ${TEAMSFX_ENV_NAME}

# Upload Teams App's Package as artifacts.
# Choose what your workflow/pipeline platform provided to
# upload build/appPackage/appPackage.staging.zip as artifacts.

# Publish Teams App.
npx teamsfx publish --env ${TEAMSFX_ENV_NAME}
