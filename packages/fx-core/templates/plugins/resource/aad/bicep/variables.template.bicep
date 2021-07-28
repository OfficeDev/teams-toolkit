
{{#contains 'fx-resource-frontend-hosting' Plugins}}
{{#notContains 'fx-resource-bot' ../Plugins}}
var applicationIdUri = 'api://{{../fx-resource-frontend-hosting.outputs.domain}}/${aadClientId}'
{{/notContains}}
{{#contains 'fx-resource-bot' ../Plugins}}
var applicationIdUri = 'api://{{../fx-resource-frontend-hosting.outputs.domain}}/botid-${BotClientId}'
{{/contains}}
{{/contains}}
{{#notContains 'fx-resource-frontend-hosting' Plugins}}
{{#contains 'fx-resource-bot' ../Plugins}}
var applicationIdUri = 'api://botid-${BotClientId}'
{{/contains}}
{{/notContains}}
