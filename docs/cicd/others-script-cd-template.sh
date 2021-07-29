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
# RUN_PROVISION


# Setup environment.
sudo apt install -y nodejs npm curl git
sudo npm install -g @microsoft/teamsfx-cli 

# Checkout the code.
git clone {RepositoryEndpoint}
cd {FolderName}

# Provision hosting environment.
if [[ "${RUN_PROVISION}" = "true" ]]
then
    teamsfx provision --subscription ${AZURE_SUBSCRIPTION_ID}
fi

# Commit provision configs if necessary.
if [[ "${RUN_PROVISION}" = "true" ]]
then
    git add .fx
    git commit -m "chore: commit provision configs"
    git push
fi

# Deploy to hosting environment.
teamsfx deploy
      
# Validate Teams App Manifest.
teamsfx validate

# Build Teams App's Package.
teamsfx build

# Upload Teams App's Package as artifacts.
# Choose what your workflow/pipeline platform provided to
# upload .fx/appPackage.zip as artifacts.

# Publish Teams App.
teamsfx publish