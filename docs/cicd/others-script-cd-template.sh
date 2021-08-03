# This is just an example workflow for continous deployment.
# You should customize it to meet your own requirements.
# Also you should export the following environment variables for Azure/M365 login:
# AZURE_ACCOUNT_NAME
# AZURE_ACCOUNT_PASSWORD
# AZURE_SUBSCRIPTION_ID
# AZURE_TENANT_ID
# M365_ACCOUNT_NAME
# M365_ACCOUNT_PASSWORD

# If the hosting environment is not provisioned, set this environment variable to false.
# or if it's provisioned and has not updates, set this environment variable to true.     
# TEAMSFX_RUN_PROVISION


# Setup environment.
# Sufficient permissions are required to run the commands below.
apt install -y nodejs npm git
# If you want to install a specific version, please specify it in the end.
# To support npx, install npm with version > 5.2.0.
npm install @microsoft/teamsfx-cli

# Checkout the code.
git clone {RepositoryEndpoint}
cd {FolderName}

# Provision hosting environment.
if [[ "${TEAMSFX_RUN_PROVISION}" = "true" ]]
then
    npx teamsfx provision --subscription ${AZURE_SUBSCRIPTION_ID}
fi

# Commit provision configs if necessary.
if [[ "${TEAMSFX_RUN_PROVISION}" = "true" ]]
then
    git add .fx
    git commit -m "chore: commit provision configs"
    git push
fi

# Validate Teams App Manifest.
npx teamsfx validate

# Deploy to hosting environment.
npx teamsfx deploy

# Build Teams App's Package.
npx teamsfx build

# Upload Teams App's Package as artifacts.
# Choose what your workflow/pipeline platform provided to
# upload .fx/appPackage.zip as artifacts.

# Publish Teams App.
npx teamsfx publish