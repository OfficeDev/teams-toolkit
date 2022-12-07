# Teams toolkit 5.0 Migration summary
1. Move teamplates/appPackage/resource & templates/appPackage/manifest.template.json to appPackage/
1. Move templates/appPakcage/aad.template.json to ./aad.manifest.template.json
1. Update placeholders in the two manifests
1. Update app id uri in the two manifests
1. Move .fx/configs/azure.parameter.{env}.json to templates/azure/...
1. Update placeholders in azure parameter files 
1. create .env.{env} if not exitsts in teamsfx/ folder (v3) (should throw error if .fx/configs/ not exists?)
1. migrate .fx/configs/config.{env}.json to .env.{env}
1. create .env.{env} if not exitsts in teamsfx/ folder (v3)
1. migrate .fx/states/state.{env}.json to .env.{env}. Skip 4 types of secrets names(should refer to userdata)
1. create .env.{env} if not exitsts in teamsfx/ folder (v3)
1. migrate .fx/states/userdata.{env} to .env.{env}