#!/usr/bin/env bash
set -evuxo pipefail

# This is just an example workflow for continuous deployment.
# You should customize it to meet your own requirements.
# Also you should export the following environment variables for Azure/M365 login:
# export AZURE_SERVICE_PRINCIPAL_NAME={AZURE_SERVICE_PRINCIPAL_NAME}
# export AZURE_SERVICE_PRINCIPAL_PASSWORD={AZURE_SERVICE_PRINCIPAL_PASSWORD}
# export AZURE_TENANT_ID={AZURE_TENANT_ID}
# export TEAMSFX_CLI_VERSION={TEAMSFX_CLI_VERSION}
# export TEAMSFX_ENV_NAME={TEAMSFX_ENV_NAME}

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
      
# Install the TTK CLI for later use.
npm install @microsoft/teamsfx-cli@${TEAMSFX_CLI_VERSION}

# Build the project.
# The way to build the current project depends on how you scaffold it.
# Different folder structures require different commands set.
# 'npm ci' may be used here to install dependencies and it depends on package-lock.json.
# If you prefer to use 'npm ci', please make sure to commit package-lock.json first, or just change it to 'npm install'.  
# cd bot; npm install; cd -;

# Run unit test.
# Currently, no opinioned solution for unit test provided during scaffolding, so,
# set up any unit test framework you prefer (for example, mocha or jest) and update the commands accordingly in below.
# npm run test

# Login Azure by service principal
npx teamsapp auth login azure --service-principal --username ${AZURE_SERVICE_PRINCIPAL_NAME} --password ${AZURE_SERVICE_PRINCIPAL_PASSWORD} --tenant ${AZURE_TENANT_ID}

# Deploy to hosting environment.
npx teamsfx deploy --env ${TEAMSFX_ENV_NAME}