# This is just an example workflow for continous integration.
# You should customize it to meet your own requirements.

# Setup environment.
# The `apt install` command is supposed to run inside the latest ubuntu system.
# If you're using other platforms, please customize the command to set up your environment.
sudo apt install -y nodejs npm

# Checkout the code.
# Adapt the placeholders to meet your needs.
git clone {RepositoryEndpoint}
cd {FolderName}

# Build the project.
# The command set below is supposed to run in a Teams App Project with only tab.
# If there're multiple sub projects pending build, please customize the commands below to build all of them.
cd tabs && npm install && npm run build

# Run unit test.
# The command below is supposed to run in a Teams App Project in which `npm run test` will trigger its unit test.
npm run test