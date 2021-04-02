// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export class RegularExprs {
    public static readonly NORMAL_NAME: RegExp = /^[a-zA-Z0-9\-]{2,60}$/;
    public static readonly BOT_ID: RegExp = /^[a-z0-9\-]{36}$/;
    public static readonly BOT_PASSWORD: RegExp = /^[a-zA-Z0-9\.\-_~]{34}$/;
    public static readonly CHARS_TO_BE_SKIPPED: RegExp = /[^a-zA-Z0-9]/g;
}

export class WebAppConstants {
    public static readonly WEB_APP_SITE_DOMAIN: string = 'azurewebsites.net';
}

export class AADRegistrationConstants {
    public static readonly GRAPH_REST_BASE_URL: string = 'https://graph.microsoft.com/v1.0';
    public static readonly AZURE_AD_MULTIPLE_ORGS: string = 'AzureADMultipleOrgs';
}

export class ScaffoldPlaceholders {
    public static readonly BOT_ID: string = '{BOT_ID}';
    public static readonly BOT_PASSWORD: string = '{BOT_PASSWORD}';
    public static readonly TEAMS_APP_ID: string = '{TEAMS_APP_ID}';
    public static readonly TEAMS_APP_SECRET: string = '{TEAMS_APP_SECRET}';
    public static readonly OAUTH_AUTHORITY: string = '{OAUTH_AUTHORITY}';
}

export class TemplateProjectsConstants {
    public static readonly NEWEST_MANIFEST_URL: string =
        'https://github.com/henzhang-ms/Teams-Templates/releases/latest/download/manifest.json';
    public static readonly GROUP_NAME_BOT: string = 'bot';
    public static readonly GROUP_NAME_MSGEXT: string = 'msgext';
    public static readonly GROUP_NAME_BOT_MSGEXT: string = 'bot-msgext';
    public static readonly DEFAULT_SCENARIO_NAME: string = 'default';
    public static readonly VERSION_RANGE: string = '0.0.*';
}

export class ProgressBarConstants {
    public static readonly SCAFFOLD_TITLE: string = 'Scaffolding';
    public static readonly SCAFFOLD_STEP_START = 'Start to do scaffolding.';
    public static readonly SCAFFOLD_STEP_FETCH_ZIP = 'Start to fetch the template zip.';
    public static readonly SCAFFOLD_STEP_REPLACEMENT = 'Start to replace placeholders in config files.';
    public static readonly SCAFFOLD_STEP_UNZIP = 'Start to extract template zip to target folder.';

    public static readonly SCAFFOLD_STEPS_NUM: number = 3;

    public static readonly PROVISION_TITLE: string = 'Provisioning';
    public static readonly PROVISION_STEP_START = 'Start to do provisioning.';
    public static readonly PROVISION_STEP_BOT_REG = 'Start to do bot registration.';
    public static readonly PROVISION_STEP_REPLACEMENT = 'Start to replace placeholders in config files.';
    public static readonly PROVISION_STEP_WEB_APP = 'Start to provision azure web app.';

    public static readonly PROVISION_STEPS_NUM: number = 3;

    public static readonly LOCAL_DEBUG_TITLE: string = 'Local Debug Provisioning';
    public static readonly LOCAL_DEBUG_STEP_START = 'Start to do local debug provisioning.';
    public static readonly LOCAL_DEBUG_STEP_BOT_REG = 'Start to do bot registration.';
    public static readonly LOCAL_DEBUG_STEP_REPLACEMENT = 'Start to replace placeholders in config files.';

    public static readonly LOCAL_DEBUG_STEPS_NUM: number = 2;

    public static readonly DEPLOY_TITLE: string = 'Deploying';
    public static readonly DEPLOY_STEP_START = 'Start to do deployment.';
    public static readonly DEPLOY_STEP_BUILD_ZIP = 'Start to build and zip package.';
    public static readonly DEPLOY_STEP_LIST_CRED = 'Start to list publish credentials.';
    public static readonly DEPLOY_STEP_ZIP_DEPLOY = 'Start to do zip deployment.';

    public static readonly DEPLOY_STEPS_NUM: number = 3;

}

export class QuestionNames {
    public static readonly PROGRAMMING_LANGUAGE = 'programmingLanguageQuestion';
    public static readonly WAY_TO_REGISTER_BOT = 'wayToRegisterBotQuestion';
    public static readonly GET_BOT_ID = 'botIdQuestion';
    public static readonly GET_BOT_PASSWORD = 'botPasswordQuestion';
    public static readonly CAPABILITIES = 'capabilities';
}

export class ContextConfigKeys {
    public static readonly APP_SERVICE_PLAN = 'appServicePlan';
    public static readonly SITE_NAME = 'siteName';
    public static readonly SITE_ENDPOINT = 'siteEndpoint';
    public static readonly VALID_DOMAINS = 'validDomains';
    public static readonly PROVISIONED = 'provisioned';
    public static readonly WEB_APPLICATION_INFO_ID = 'webApplicationInfo.id';
    public static readonly WEB_APPLICATION_INFO_RESOURCE = 'webApplicationInfo.resource';
    public static readonly BOTS_SECTION = 'bots';
    public static readonly BOT_CHANNEL_REGISTRATION = 'botChannelReg';
}

export class LifecycleFuncNames {
    public static readonly PRE_SCAFFOLD = 'preScaffold';
    public static readonly SCAFFOLD = 'scaffold';
    public static readonly POST_SCAFFOLD = 'postScaffold';

    public static readonly PRE_PROVISION = 'preProvision';
    public static readonly PROVISION = 'provision';
    public static readonly POST_PROVISION = 'postProvision';

    public static readonly PRE_DEPLOY = 'preDeploy';
    public static readonly DEPLOY = 'deploy';
    public static readonly POST_DEPLOY = 'postDeploy';

    public static readonly PRE_LOCAL_DEBUG = 'preLocalDebug';
    public static readonly LOCAL_DEBUG = 'localDebug';
    public static readonly POST_LOCAL_DEBUG = 'postLocalDebug';

    // extra
    public static readonly PROVISION_WEB_APP = 'provisionWebApp';
    public static readonly UPDATE_MESSAGE_ENDPOINT = 'updateMessageEndpoint';
    public static readonly REUSE_EXISTING_BOT_REG = 'reuseExistingBotRegistration';
    public static readonly CREATE_NEW_BOT_REG = 'createNewBotRegistration';
}

export class RetryTimes {
    public static readonly GENERATE_CLIENT_SECRET = 5;
}
export class ExceptionNames {
    // System Exceptions
    public static readonly PRECONDITION_EXCEPTION = 'Precondition Exception';
    public static readonly CLIENT_CREATION_EXCEPTION = 'Client Creation Exception';
    public static readonly PROVISION_EXCEPTION = 'Provision Exception';
    public static readonly CONFIG_UPDATING_EXCEPTION = 'Config Updating Exception';
    public static readonly VALIDATION_EXCEPTION = 'Validation Exception';
    public static readonly LIST_PUBLISHING_CREDENTIALS_EXCEPTION = 'List Publishing Credentials Exception';
    public static readonly ZIP_DEPLOY_EXCEPTION = 'Zip Deploy Exception';
    public static readonly MSG_ENDPOINT_UPDATING_EXCEPTION = 'Message Endpoint Updating Exception';
    public static readonly DOWNLOAD_EXCEPTION = 'Download Exception';
    public static readonly MANIFEST_FORMAT_EXCEPTION = 'Template Manifest Format Exception';
    public static readonly TEMPLATE_PROJECT_NOT_FOUND_EXCEPTION = 'Template Project Not Found Exception';
    public static readonly LANGUAGE_STRATEGY_NOT_FOUND_EXCEPTION = 'Language Strategy Not Found Exception';
    public static readonly COMMAND_EXECUTION_EXCEPTION = 'Command Execution Exception';

    // User Exceptions
    public static readonly USER_INPUTS_EXCEPTION = 'User Inputs Exception';
    public static readonly PACK_DIR_EXISTENCE_EXCEPTION = 'Pack Directory Existence Exception';
}

export class Links {
    public static readonly ISSUE_LINK = '';
    public static readonly HELP_LINK = '';
}

export class Alias {
    public static readonly TEAMS_BOT_PLUGIN = 'TBP';
}