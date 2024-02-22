"""
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.
"""

import os

class Config:
    """Bot Configuration"""

    port = 3978
    app_id = os.environ.get("BOT_ID", "")
    app_password = os.environ.get("BOT_PASSWORD", "")
    OPENAI_KEY = os.environ.get("OPENAI_KEY", "") # OpenAI API key
    OPENAI_MODEL_DEPLOYMENT_NAME = os.environ.get("OPENAI_MODEL_DEPLOYMENT_NAME", "") # OpenAI model deployment name
    AZURE_OPENAI_KEY = os.environ.get("AZURE_OPENAI_KEY", "") # Azure OpenAI API key
    AZURE_OPENAI_MODEL_DEPLOYMENT_NAME = os.environ.get("AZURE_OPENAI_MODEL_DEPLOYMENT_NAME", "") # Azure OpenAI model deployment name
    AZURE_OPENAI_ENDPOINT = os.environ.get("AZURE_OPENAI_ENDPOINT", "") # Azure OpenAI endpoint
