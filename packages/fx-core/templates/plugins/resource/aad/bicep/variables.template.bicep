
{{#contains 'fx-resource-frontend-hosting' Plugins}}
{{#notContains 'fx-resource-bot' ../Plugins}}
var m365ApplicationIdUri = 'api://${ {{~../PluginOutput.fx-resource-frontend-hosting.Outputs.domain~}} }/${m365ClientId}'
{{/notContains}}
{{#contains 'fx-resource-bot' ../Plugins}}
var m365ApplicationIdUri = 'api://${ {{~../PluginOutput.fx-resource-frontend-hosting.Outputs.domain~}} }/botid-${bot_aadClientId}'
{{/contains}}
{{/contains}}
{{#notContains 'fx-resource-frontend-hosting' Plugins}}
{{#contains 'fx-resource-bot' ../Plugins}}
var m365ApplicationIdUri = 'api://botid-${bot_aadClientId}'
{{/contains}}
{{/notContains}}
