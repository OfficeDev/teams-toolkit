{
    "$schema": "https://developer.microsoft.com/json-schemas/copilot/declarative-agent/v1.0/schema.json",
    "version": "v1.0",
    "name": "{{appName}}",
    "description": "Declarative agent created with Teams Toolkit can assist user in calling APIs and retrieving responses",
    {{#FileFunction}}
    "instructions": "$[file('instruction.txt')]"
    {{/FileFunction}}
    {{^FileFunction}}
    "instructions": "You are a declarative agent created with Team Toolkit. Assist user in calling APIs and retrieving responses. You can only use data from actions."
    {{/FileFunction}}
}