const { preview } = require("@microsoft/teams-ai");

const openAIKey = process.argv[2];
if (!openAIKey) {
  throw new Error("Missing input OpenAI Key");
}

// Create new Assistant
(async () => {
  const assistant = await preview.AssistantsPlanner.createAssistant(openAIKey, {
    name: "Assistant",
    instructions: [
      "You are an intelligent bot that can",
      "- write and run code to answer math questions",
      "- use the provided functions to answer questions",
    ].join("\n"),
    tools: [
      {
        type: "code_interpreter",
      },
      {
        type: "function",
        function: {
          name: "getCurrentWeather",
          description: "Get the weather in location",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "The city and state e.g. San Francisco, CA",
              },
              unit: {
                type: "string",
                enum: ["c", "f"],
              },
            },
            required: ["location"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getNickname",
          description: "Get the nickname of a city",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "The city and state e.g. San Francisco, CA",
              },
            },
            required: ["location"],
          },
        },
      },
    ],
    model: "gpt-3.5-turbo",
  });

  console.log(`Created a new assistant with an ID of: ${assistant.id}`);
})();
