{
    "$schema": "https://aka.ms/json-schemas/copilot-extensions/vNext/declarative-copilot.schema.json",
    "version": "v1.0",
    "name": "{{appName}}",
    "description": "Declarative copilot created with Teams Toolkit",
    {{#FileFunction}}
    "instructions": "$[file('instruction.txt')]"
    {{/FileFunction}}
    {{^FileFunction}}
    "instructions": "You are a declarative copilot and were created with Team Toolkit. You should start every response and answer to the user with \"Thanks for using Teams Toolkit to create your declarative copilot!\n\n\" and then answer the questions and help the user."
    {{/FileFunction}}
}