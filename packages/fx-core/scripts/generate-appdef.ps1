## prerequisite 
# dotnet tool install --global CSharpToTypeScript.CLITool

$appstudio_project = "";

## Generate interfaces under AppStudio.API.Models
$modelFiles = @(
    "AppDefinition",
    "AppUser",
    "AppUserSetting",
    "AppEnvironment",
    "AppEnvironmentProperty",
    "ActivityDefinitionItem",
    "AppPermissionsItem",
    "AppPermissionNodeItem",
    "AppPermissionNodeItemType",
    "Bot",
    "BotCommand",
    "ConfigurableTab",
    "MessagingExtensionCommand",
    "MessagingExtensionMessageHandler",
    "MessagingExtensionCommandParameter",
    "MessagingExtensionCommandTaskInfo",
    "MessagingExtensionMessageHandlerLink",
    "MessagingExtensionParameterChoice",
    "StaticTab",
    "Connector",
    "SubscriptionOffer",
    "GraphConnector",
    "MessagingExtension",
    "DefaultGroupCapability",
    "MeetingExtensionDefinitionItem",
    "AppCategory",
    "DisabledScopeItemType",
    "ActivitiesDefinitionItem",
    "AppItemHostedCapability",
    "AppItemIndustry",
    "AppAuthorizationItem",
    "LocalizationInfo",
    "Language",
    "WebApplicationInfoItem",
    "TogetherModeSceneItem"
)

foreach($file in $modelFiles) {
    dotnet cs2ts $appstudio_project/AppStudio/AppStudio.API/Models/$file.cs -o ../src/plugins/resource/appstudio/interfaces -i Simple -q Double -n Undefined
}

## Some customizations

# skip some classes
$skipFiles = "AppCatalogExtensionDefinitionItem|MobileModuleDefinitionItem|SupportedTenantRegions|LicenseCategory|RestrictedTenantTypes"
$appdefinition_file = "../src/plugins/resource/appstudio/interfaces/appDefinition.ts"
$appdefinition_content = Get-Content $appdefinition_file
$appdefinition_content = $appdefinition_content | Select-String -Pattern $skipFiles -NotMatch

# make fields optional
$appdefinition_content = $appdefinition_content -replace "([a-zA-Z]):", '$1?:'
Set-Content -Path $appdefinition_file -Value $appdefinition_content

# add copyright header
$copyright = "// Copyright (c) Microsoft Corporation.`n// Licensed under the MIT license.`n"
foreach($file in $modelFiles) {
    $file_path = "../src/plugins/resource/appstudio/interfaces/" + $file.substring(0,1).tolower() + $file.substring(1) + ".ts"
    $content = Get-Content $file_path
    Set-Content -Path $file_path -Value $copyright
    Add-Content -Path $file_path -Value $content
}
