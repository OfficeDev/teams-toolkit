# This is just an example workflow for continous deployment.
# You should customize it to meet your own requirements.

# Setup environment.
# Also you should export the following environment variables for login:
# AZURE_ACCOUNT_NAME
# AZURE_ACCOUNT_PASSWORD
# AZURE_SUBSCRIPTION_ID
# AZURE_TENANT_ID
# M365_ACCOUNT_NAME
# M365_ACCOUNT_PASSWORD
# M365_TENANT_ID
sudo apt install -y nodejs npm
sudo npm install -g @microsoft/teamsfx-cli 

# Checkout the code.
git clone {RepositoryEndpoint}
cd {FolderName}
      
# Provision hosting environment.
teamsfx provision --subscription ${AZURE_SUBSCRIPTION_ID}

# Deploy to hosting environment.
teamsfx deploy
      
# Validate Teams App Manifest.
teamsfx validate

# Publish Teams App.
teamsfx publish