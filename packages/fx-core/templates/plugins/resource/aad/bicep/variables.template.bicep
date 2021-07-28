
{{#contains 'fx-resource-frontend-hosting' Plugins}}
{{#notContains 'fx-resource-bot' ../Plugins}}
var applicationIdUri = 'api://{{../PluginOutput.fx-resource-frontend-hosting.Outputs.domain}}/${aadClientId}'
{{/notContains}}
{{#contains 'fx-resource-bot' ../Plugins}}
var applicationIdUri = 'api://{{../PluginOutput.fx-resource-frontend-hosting.Outputs.domain}}/botid-${BotClientId}'
{{/contains}}
{{/contains}}
{{#notContains 'fx-resource-frontend-hosting' Plugins}}
{{#contains 'fx-resource-bot' ../Plugins}}
var applicationIdUri = 'api://botid-${BotClientId}'
{{/contains}}
{{/notContains}}
