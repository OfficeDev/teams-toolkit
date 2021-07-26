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

# The following two environment variables works together with AZURE_STORAGE_CREDENTIALS
# to specify the place where the provision configs are saved to.
# STORAGE_ACCOUNT
# BLOB_CONTAINER

# Setup environment.
sudo apt install -y nodejs npm curl
sudo npm install -g @microsoft/teamsfx-cli 
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# The provision configs shouldn't be commited into the code, 
# since multiple environments are existing, for example, test, stage, and product.
# These configs should be saved by environment, and in this example script file,
# Azure Storage Blob is used to save the provision configs and also used to upload and download the configs.
az login --service-principal -u ${SP_CLIENT_ID} -p ${SP_CLIENT_SECRET} --tenant ${SP_TENANT_ID}

# Checkout the code.
git clone {RepositoryEndpoint}
cd {FolderName}

# If RUN_PROVISION is false, then resources must have been provisioned,
# so, it's unnecessary to run provision again.
# The provision configs still needs to be downloaded for later operations like deploy, and publish.
# In this example script file, Azure Storage Blob is used to store the provision configs, but other
# solutions are also okay if you prefer to use them.
if [[ "${RUN_PROVISION}" = "false" ]]
then
    az storage blob download-batch -d ./.fx --account-name ${STORAGE_ACCOUNT} -s ${BLOB_CONTAINER}
fi

# Provision hosting environment.
if [[ "${RUN_PROVISION}" = "true" ]]
then
    teamsfx provision --subscription ${AZURE_SUBSCRIPTION_ID}
fi

# Upload Provision Configs onto Azure Storage Blob.
if [[ "${RUN_PROVISION}" = "true" ]]
then
    az storage blob upload-batch -d ${BLOB_CONTAINER} --account-name ${STORAGE_ACCOUNT} -s ./.fx
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