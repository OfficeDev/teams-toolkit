import asyncio, os
from teams.ai.planners import AssistantsPlanner
from openai.types.beta import AssistantCreateParams
from openai.types.beta.function_tool_param import FunctionToolParam
from openai.types.shared_params import FunctionDefinition

{{#useOpenAI}}
config = {
    'OPENAI_API_KEY': '<your-openai-api-key>'
}
{{/useOpenAI}}
{{#useAzureOpenAI}}
config = {
    'AZURE_OPENAI_API_KEY': '<your-azure-openai-api-key>',
    'AZURE_OPENAI_ENDPOINT': '<your-azure-openai-endpoint>',
    'AZURE_OPENAI_MODEL_DEPLOYMENT_NAME': '<your-azure-openai-model-deployment-name>'
}
{{/useAzureOpenAI}}

async def main():
    options = AssistantCreateParams(
        name="Assistant",
        instructions="\n".join([
            "You are an intelligent bot that can",
            "- write and run code to answer math questions",
            "- use the provided functions to answer questions"
        ]),
        tools=[
            {
                "type": "code_interpreter",
            },
            FunctionToolParam(
                type="function",
                function=FunctionDefinition(
                    name="getCurrentWeather",
                    description="Get the weather in location",
                    parameters={
                        "type": "object",
                        "properties": {
                            "location": {
                                "type": "string",
                                "description": "The city and state e.g. San Francisco, CA",
                            },
                            "unit": {
                                "type": "string",
                                "enum": ["c", "f"],
                            },
                        },
                        "required": ["location"],
                    }
                )
            ),
            FunctionToolParam(
                type="function",
                function=FunctionDefinition(
                    name="getNickname",
                    description="Get the nickname of a city",
                    parameters={
                        "type": "object",
                        "properties": {
                            "location": {
                                "type": "string",
                                "description": "The city and state e.g. San Francisco, CA",
                            },
                        },
                        "required": ["location"],
                    }
                )
            )            
        ],
        {{#useOpenAI}}
        model="gpt-3.5-turbo",
        {{/useOpenAI}}
        {{#useAzureOpenAI}}
        model=config['AZURE_OPENAI_MODEL_DEPLOYMENT_NAME'],
        {{/useAzureOpenAI}}
    )

    {{#useOpenAI}}
    assistant = await AssistantsPlanner.create_assistant(api_key=config['OPENAI_API_KEY'], api_version="", organization="", endpoint="", request=options)
    {{/useOpenAI}}
    {{#useAzureOpenAI}}
    assistant = await AssistantsPlanner.create_assistant(
        api_key=config['AZURE_OPENAI_API_KEY'], 
        api_version="", 
        organization="", 
        endpoint=config['AZURE_OPENAI_ENDPOINT'], 
        request=options
    )
    {{/useAzureOpenAI}}
    print(assistant.tools)
    print(f"Created a new assistant with an ID of: {assistant.id}")

asyncio.run(main())