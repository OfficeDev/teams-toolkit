"""
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.

Description: initialize the app and listen for `message` activitys
"""

import sys
import traceback

from botbuilder.core import BotFrameworkAdapterSettings, TurnContext, MemoryStorage
from teams import AIHistoryOptions, AIOptions, Application, ApplicationOptions, AzureOpenAIPlanner, AzureOpenAIPlannerOptions, OpenAIPlanner, OpenAIPlannerOptions, TurnState
from state import *

from config import Config
config = Config()

default_prompt_folder = "prompts"
default_prompt = "chat"

# Use Azure OpenAI
planner = AzureOpenAIPlanner(
    AzureOpenAIPlannerOptions(
        config.AZURE_OPENAI_KEY,
        config.AZURE_OPENAI_MODEL_DEPLOYMENT_NAME,
        config.AZURE_OPENAI_ENDPOINT,
        prompt_folder=default_prompt_folder,
    )
)
# Uncomment the following lines to use OpenAI
# planner = OpenAIPlanner(
#     OpenAIPlannerOptions(
#         config.OPENAI_KEY,
#         config.OPENAI_MODEL_DEPLOYMENT_NAME,
#         prompt_folder=default_prompt_folder,
#     )
# )
storage = MemoryStorage()
app = Application[TurnState](
    ApplicationOptions(
        auth=BotFrameworkAdapterSettings(
            app_id=config.app_id,
            app_password=config.app_password,
        ),
        ai=AIOptions(
            planner=planner,
            prompt=default_prompt,
            history=AIHistoryOptions(assistant_history_type="text"),
        ),
        storage=storage,
    )
)

@app.turn_state_factory
async def on_state_factory(activity: Activity):
    return await AppTurnState.from_activity(activity, storage)

@app.error
async def on_error(context: TurnContext, error: Exception):
    # This check writes out errors to console log .vs. app insights.
    # NOTE: In production environment, you should consider logging this to Azure
    #       application insights.
    print(f"\n [on_turn_error] unhandled error: {error}", file=sys.stderr)
    traceback.print_exc()

    # Send a message to the user
    await context.send_activity("The bot encountered an error or bug.")
