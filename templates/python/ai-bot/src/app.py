"""
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.
"""
from api import api
from bot import config

if __name__ == "__main__":
    try:
        api.run(host='localhost', port=config.port)
    except Exception as error:
        raise error
