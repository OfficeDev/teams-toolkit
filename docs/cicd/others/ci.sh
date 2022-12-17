#!/usr/bin/env bash
set -euxo pipefail

# This is just an example workflow for continuous integration.
# You should customize it to meet your own requirements.

# Setup environment.
# The `apt install` command is supposed to run inside the latest ubuntu system.
# If you're using other platforms, please customize the command to set up your environment.
# Sufficient permissions are required to run the command below.
apt install -y nodejs npm

# Checkout the code.
# Update the placeholder of {RepositoryEndpoint} to your repository's endpoint.
git clone {RepositoryEndpoint}
# Update the placeholder of {FolderName} to your repository's folder name after git clone.
cd {FolderName}

# Build the project.
# The way to build the current project depends on how you scaffold it.
# Different folder structures require different commands set.
# 'npm ci' is used here to install dependencies and it depends on package-lock.json.
# If you prefer to use 'npm ci', please make sure to commit package-lock.json first, or just change it to 'npm install'.
# cd bot && npm install && cd -

# Run unit test.
# Currently, no opinionated solution for unit test provided during scaffolding, so,
# set up any unit test framework you prefer (for example, mocha or jest) and update the commands accordingly in below.
# npm run test
