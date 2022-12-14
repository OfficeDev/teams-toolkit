#!/usr/bin/env bash
set -euxo pipefail

# This is just an example workflow for continuous deployment.
# You should customize it to meet your own requirements.
# Also you should export the following environment variables for Azure/M365 login:
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

# Install the TTK CLI for later use.
npm install @microsoft/teamsfx-cli@${TEAMSFX_CLI_VERSION}

# This step is to pack the Teams App as zip file,
# which can be used to be uploaded onto Teams Client for installation.
# Build Teams App's Package.
npx teamsfx package --env ${TEAMSFX_ENV_NAME}

# Upload Teams App's Package as artifacts.
# Choose what your workflow/pipeline platform provided to
# upload build/appPackage/appPackage.staging.zip as artifacts.

# Publish Teams App.
npx teamsfx publish --env ${TEAMSFX_ENV_NAME} 
