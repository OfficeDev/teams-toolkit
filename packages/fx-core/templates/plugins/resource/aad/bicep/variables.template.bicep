
{{#contains 'fx-resource-frontend-hosting' plugins}}
{{#notContains 'fx-resource-bot' ../plugins}}
var applicationIdUri = `api://{{../fx-resource-frontend-hosting.outputs.domain}}/${AADClientId}`
{{/notContains}}
{{#contains 'fx-resource-bot' ../plugins}}
var applicationIdUri = `api://{{../fx-resource-frontend-hosting.outputs.domain}}/botid-${BotClientId}`
{{/contains}}
{{/contains}}
{{#notContains 'fx-resource-frontend-hosting' plugins}}
{{#contains 'fx-resource-bot' ../plugins}}
var applicationIdUri = `api://{{../fx-resource-bot.outputs.domain}}/botid-${BotClientId}`
{{/contains}}
{{/notContains}}