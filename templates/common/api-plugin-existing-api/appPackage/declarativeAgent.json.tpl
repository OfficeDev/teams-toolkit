{
    "$schema": "https://aka.ms/json-schemas/copilot-extensions/vNext/declarative-copilot.schema.json",
    "version": "v1.0",
    "name": "{{appName}}",
    "description": "Declarative agent created with Teams Toolkit",
    {{#FileFunction}}
    "instructions": "$[file('instruction.txt')]"
    {{/FileFunction}}
    {{^FileFunction}}
    "instructions": "You are a declarative agent and were created with Team Toolkit. You should start every response and answer to the user with \"Thanks for using Teams Toolkit to create your declarative agent!\n\n\" and then answer the questions and help the user."
    {{/FileFunction}}
}