"""
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.

Description: initialize the api and route incoming messages
to our app
"""

from botbuilder.schema import Activity
from flask import Flask, request, jsonify

from bot import app

api = Flask(__name__)

@api.route('/api/messages', methods=['POST'])
async def on_messages():
    activity = Activity().deserialize(request.json)

    auth_header = request.headers['Authorization'] if 'Authorization' in request.headers else ''
    response = await app.process_activity(activity, auth_header)
    
    if response:
        return jsonify(response.body), response.status
    return '', 200
