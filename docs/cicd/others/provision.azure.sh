#!/usr/bin/env bash
set -evuxo pipefail

# This is just an example workflow for continuous deployment.
# You should customize it to meet your own requirements.
# Also you should export the following environment variables for Azure/M365 login:
# export AZURE_SERVICE_PRINCIPAL_NAME={AZURE_SERVICE_PRINCIPAL_NAME}
# export AZURE_SERVICE_PRINCIPAL_PASSWORD={AZURE_SERVICE_PRINCIPAL_PASSWORD}
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

# Install the TTK CLI for later use.
npm install @microsoft/teamsfx-cli@${TEAMSFX_CLI_VERSION}

# Login Azure by service principal
npx teamsfx account login azure --service-principal --username ${AZURE_SERVICE_PRINCIPAL_NAME} --password ${AZURE_SERVICE_PRINCIPAL_PASSWORD} --tenant ${AZURE_TENANT_ID}

# We suggest to do the `teamsfx provision` step manually or in a separate workflow. The following steps are for your reference.
# After provisioning, you should commit necessary files into the repository. 
npx teamsfx provision --subscription ${AZURE_SUBSCRIPTION_ID} --env ${TEAMSFX_ENV_NAME}

# Commit provision configs if necessary.
git config user.name "git-agent"
git config user.email "git-agent@azure.com"
git add .
git commit -m "chore: commit provision configs"
git push origin {YOUR_TARGET_BRANCH}