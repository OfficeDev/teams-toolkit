# This is just an example workflow for continous integration.
# You should customize it to meet your own requirements.

# Setup environment.
# The `apt install` command is supposed to run inside the latest ubuntu system.
# If you're using other platforms, please customize the command to set up your environment.
# Sufficient permissions are required to run the command below.
apt install -y nodejs npm

# Checkout the code.
# Adapt the placeholders to meet your needs.
git clone {RepositoryEndpoint}
cd {FolderName}

# Build the project.
# The way to build the current project depends on how you scaffold it.
# Different folder structures require different commands set.
cd tabs && npm ci && npm run build

# Run unit test.
# Currently, no opinioned solution for unit test provided during scaffolding, so,
# set up any unit test framework you prefer and update the commands accordingly in below.
npm run test