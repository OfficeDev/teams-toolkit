import asyncio
from dataclasses import dataclass
import json
import os
import sys
import traceback
from typing import Generic, TypeVar

from botbuilder.core import MemoryStorage, TurnContext
from teams import Application, ApplicationOptions, TeamsAdapter
from teams.ai import AIOptions
from teams.ai.models import AzureOpenAIModelOptions, OpenAIModel, OpenAIModelOptions
from teams.ai.planners import ActionPlanner, ActionPlannerOptions
from teams.ai.prompts import PromptManager, PromptManagerOptions
from teams.ai.actions import ActionTypes
from teams.state import TurnState

from .AzureAISearchDataSource import AzureAISearchDataSource, AzureAISearchDataSourceOptions
from .config import Config

config = Config()

class ConversationState:
    pass

T = TypeVar('T')

class TurnState(Generic[T]):
    pass

ApplicationTurnState = TurnState[ConversationState]

# Create AI components
model: OpenAIModel

model = OpenAIModel(
    AzureOpenAIModelOptions(
        api_key=config.AZURE_OPENAI_API_KEY,
        default_model=config.AZURE_OPENAI_MODEL_DEPLOYMENT_NAME,
        endpoint=config.AZURE_OPENAI_ENDPOINT,
    )
)
    
prompts = PromptManager(PromptManagerOptions(prompts_folder=f"{os.getcwd()}/src/prompts"))

prompts.add_data_source(
    AzureAISearchDataSource(
        AzureAISearchDataSourceOptions(
            name='azure-ai-search',
            indexName='contoso-electronics',
            azureOpenAIApiKey=config.AZURE_OPENAI_API_KEY,
            azureOpenAIEndpoint=config.AZURE_OPENAI_ENDPOINT,
            azureOpenAIEmbeddingDeployment=config.AZURE_OPENAI_MODEL_DEPLOYMENT_NAME,
            azureAISearchApiKey=config.AZURE_SEARCH_KEY,
            azureAISearchEndpoint=config.AZURE_SEARCH_ENDPOINT,
        )
    )
)

planner = ActionPlanner(
    ActionPlannerOptions(model=model, prompts=prompts, default_prompt="chat")
)

# Define storage and application
storage = MemoryStorage()
bot_app = Application[ApplicationTurnState](
    ApplicationOptions(
        bot_app_id=config.APP_ID,
        storage=storage,
        adapter=TeamsAdapter(config),
        ai=AIOptions(planner=planner),
    )
)

@bot_app.conversation_update("membersAdded")
async def on_members_added(context: TurnContext, state: TurnState):
    await context.send_activity("How can I help you today?")

# @bot_app.ai.action(ActionTypes.SAY_COMMAND)
# async def format_response(context: TurnContext, state: TurnState, data):
#     add_tag = False
#     in_code_block = False
#     output = []
#     response = data.response.split('\n')
#     for line in response:
#         if line.startswith('```'):
#             if not in_code_block:
#                 add_tag = True
#                 in_code_block = True
#             else:
#                 output[-1] += '</pre>'
#                 add_tag = False
#                 in_code_block = False
#         elif add_tag:
#             output.append(f"<pre>{line}")
#             add_tag = False
#         else:
#             output.append(line)

#     formatted_response = '\n'.join(output)
#     await context.send_activity(formatted_response)

#     return ''

@bot_app.ai.action(ActionTypes.FLAGGED_INPUT)
async def flag_input(context: TurnContext, _state: ApplicationTurnState, data):
    await context.send_activity(f"I'm sorry your message was flagged: {json.dumps(data)}")
    return ActionTypes.STOP
    
@bot_app.ai.action(ActionTypes.FLAGGED_OUTPUT)
async def flag_output(context: TurnContext, _state: ApplicationTurnState, data):
    await context.send_activity(f"I'm not allowed to talk about such things.")
    return ActionTypes.STOP

@bot_app.error
async def on_error(context: TurnContext, error: Exception):
    # This check writes out errors to console log .vs. app insights.
    # NOTE: In production environment, you should consider logging this to Azure
    #       application insights.
    print(f"\n [on_turn_error] unhandled error: {error}", file=sys.stderr)
    traceback.print_exc()

    # Send a message to the user
    await context.send_activity("The bot encountered an error or bug.")