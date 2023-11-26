#!/bin/bash

# The file path where the API Key is located.
file_path="env/.env.$1.user"

# Check if the file exists
if [ -f "$file_path" ]; then
    # Get the value of SECRET_API_KEY
    secret_api_key=$(grep -Po '(?<=SECRET_API_KEY=).*' "$file_path")

    # Check if the value is not empty
    if [ -n "$secret_api_key" ]; then
        echo "API Key already exists in $file_path."
    else
        # Generate a random string as the API Key, and write it to the env file.
        echo "::set-teamsfx-env SECRET_API_KEY=$(openssl rand -base64 12)"
        echo "Teams Toolkit has automatically generated a key for API authentication, you can refer to README.md located in your project for more details."
    fi
else
    echo "File containing the API key not found."
fi
