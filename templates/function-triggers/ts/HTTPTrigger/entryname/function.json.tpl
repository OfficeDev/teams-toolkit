{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": [
        "get",
        "post"
      ],
      "route": "{{functionName}}"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "$return"
    },
    {
      "direction": "in",
      "name": "teamsfxContext",
      "type": "TeamsFx"
    }
  ],
  "scriptFile": "../dist/{{functionName}}/index.js"
}