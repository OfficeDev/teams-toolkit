const { AssistantsPlanner } = require("@microsoft/teams-ai");
const config = require("./config");

if (!config.openAIKey) {
  throw new Error("Missing OPENAI_API_KEY");
}

if (!config.openAIAssistantId) {
  // Create new Assistant
  (async () => {
    const assistant = await AssistantsPlanner.createAssistant(config.openAIKey, {
      name: "Math Tutor",
      instructions: "You are a personal math tutor. Write and run code to answer math questions.",
      tools: [{ type: "code_interpreter" }],
      model: "gpt-3.5-turbo",
    });

    console.log(`Created a new assistant with an ID of: ${assistant.id}`);
  })();
} else {
  console.log(`Assistant ${config.openAIAssistantId} already configured.`);
}
