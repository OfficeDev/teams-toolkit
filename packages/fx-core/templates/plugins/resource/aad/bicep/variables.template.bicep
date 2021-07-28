
{{#contains 'fx-resource-frontend-hosting' plugins}}
{{#notContains 'fx-resource-bot' ../plugins}}
var applicationIdUri = `api://{{../fx-resource-frontend-hosting.outputs.domain}}/${aadClientId}`
{{/notContains}}
{{#contains 'fx-resource-bot' ../plugins}}
var applicationIdUri = `api://{{../fx-resource-frontend-hosting.outputs.domain}}/botid-${BotClientId}`
{{/contains}}
{{/contains}}
{{#notContains 'fx-resource-frontend-hosting' plugins}}
{{#contains 'fx-resource-bot' ../plugins}}
var applicationIdUri = `api://botid-${BotClientId}`
{{/contains}}
{{/notContains}}
