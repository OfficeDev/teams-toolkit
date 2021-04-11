// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { WayToRegisterBot } from "./enums/wayToRegisterBot";
import { OptionItem } from "fx-api";
import { ProgrammingLanguage } from "./enums/programmingLanguage";

export class RegularExprs {
    public static readonly NORMAL_NAME: RegExp = /^[a-zA-Z0-9\-]{2,60}$/;
    public static readonly BOT_ID: RegExp = /^[a-z0-9\-]{36}$/;
    public static readonly BOT_PASSWORD: RegExp = /^[a-zA-Z0-9\.\-_~]{34}$/;
    public static readonly CHARS_TO_BE_SKIPPED: RegExp = /[^a-zA-Z0-9]/g;
}

export class WebAppConstants {
    public static readonly WEB_APP_SITE_DOMAIN: string = "azurewebsites.net";
}

export class AADRegistrationConstants {
    public static readonly GRAPH_REST_BASE_URL: string = "https://graph.microsoft.com/v1.0";
    public static readonly AZURE_AD_MULTIPLE_ORGS: string = "AzureADMultipleOrgs";
}

export class ScaffoldPlaceholders {
    public static readonly BOT_ID: string = "{BOT_ID}";
    public static readonly BOT_PASSWORD: string = "{BOT_PASSWORD}";
    public static readonly TEAMS_APP_ID: string = "{TEAMS_APP_ID}";
    public static readonly TEAMS_APP_SECRET: string = "{TEAMS_APP_SECRET}";
    public static readonly OAUTH_AUTHORITY: string = "{OAUTH_AUTHORITY}";
}

export class TemplateProjectsConstants {
    public static readonly NEWEST_MANIFEST_URL: string =
        "https://github.com/henzhang-ms/Teams-Templates/releases/latest/download/manifest.json";
    public static readonly GROUP_NAME_BOT: string = "bot";
    public static readonly GROUP_NAME_MSGEXT: string = "msgext";
    public static readonly GROUP_NAME_BOT_MSGEXT: string = "bot-msgext";
    public static readonly DEFAULT_SCENARIO_NAME: string = "default";
    public static readonly VERSION_RANGE: string = "0.0.*";
}

export class ProgressBarConstants {
    public static readonly SCAFFOLD_TITLE: string = "Scaffolding Bot";
    public static readonly SCAFFOLD_STEP_START = "Start to do scaffolding.";
    public static readonly SCAFFOLD_STEP_FETCH_ZIP = "Start to fetch the template zip.";
    public static readonly SCAFFOLD_STEP_UNZIP = "Start to extract template zip to target folder.";

    public static readonly SCAFFOLD_STEPS_NUM: number = 2;

    public static readonly PROVISION_TITLE: string = "Provisioning Bot";
    public static readonly PROVISION_STEP_START = "Start to do provisioning.";
    public static readonly PROVISION_STEP_BOT_REG = "Start to do bot registration.";
    public static readonly PROVISION_STEP_WEB_APP = "Start to provision azure web app.";

    public static readonly PROVISION_STEPS_NUM: number = 2;

    public static readonly LOCAL_DEBUG_TITLE: string = "Local Debug Provisioning Bot";
    public static readonly LOCAL_DEBUG_STEP_START = "Start to do local debug provisioning.";
    public static readonly LOCAL_DEBUG_STEP_BOT_REG = "Start to do bot registration.";

    public static readonly LOCAL_DEBUG_STEPS_NUM: number = 1;

    public static readonly DEPLOY_TITLE: string = "Deploying Bot";
    public static readonly DEPLOY_STEP_START = "Start to deploy.";
    public static readonly DEPLOY_STEP_NPM_INSTALL = "Run npm install.";
    public static readonly DEPLOY_STEP_ZIP_FOLDER = "Zip package folder."
    public static readonly DEPLOY_STEP_LIST_CRED = "List publish credentials.";
    public static readonly DEPLOY_STEP_ZIP_DEPLOY = "Call zip deploy rest api.";

    public static readonly DEPLOY_STEPS_NUM: number = 4;

}

export class QuestionNames {
    public static readonly PROGRAMMING_LANGUAGE = "programmingLanguageQuestion";
    public static readonly WAY_TO_REGISTER_BOT = "wayToRegisterBotQuestion";
    public static readonly GET_BOT_ID = "botIdQuestion";
    public static readonly GET_BOT_PASSWORD = "botPasswordQuestion";
    public static readonly CAPABILITIES = "capabilities";
}

export class LifecycleFuncNames {
    public static readonly PRE_SCAFFOLD = "preScaffold";
    public static readonly SCAFFOLD = "scaffold";
    public static readonly POST_SCAFFOLD = "postScaffold";

    public static readonly PRE_PROVISION = "preProvision";
    public static readonly PROVISION = "provision";
    public static readonly POST_PROVISION = "postProvision";

    public static readonly PRE_DEPLOY = "preDeploy";
    public static readonly DEPLOY = "deploy";
    public static readonly POST_DEPLOY = "postDeploy";

    public static readonly PRE_LOCAL_DEBUG = "preLocalDebug";
    public static readonly LOCAL_DEBUG = "localDebug";
    public static readonly POST_LOCAL_DEBUG = "postLocalDebug";

    // extra
    public static readonly PROVISION_WEB_APP = "provisionWebApp";
    public static readonly UPDATE_MESSAGE_ENDPOINT_AZURE = "updateMessageEndpointOnAzure";
    public static readonly UPDATE_MESSAGE_ENDPOINT_APPSTUDIO = "updateMessageEndpointOnAppStudio";
    public static readonly REUSE_EXISTING_BOT_REG = "reuseExistingBotRegistration";
    public static readonly CREATE_NEW_BOT_REG_AZURE = "createNewBotRegistrationOnAzure";
    public static readonly CREATE_NEW_BOT_REG_APPSTUDIO = "createNewBotRegistrationOnAppStudio";
}

export class Retry {
    public static readonly GENERATE_CLIENT_SECRET_TIMES = 10;
    public static readonly GENERATE_CLIENT_SECRET_GAP_MS = 5000;
    public static readonly UPDATE_MESSAGE_ENDPOINT_TIMES = 10;
    public static readonly UPDATE_MESSAGE_ENDPOINT_GAP_MS = 5000;
}
export class ExceptionNames {
    // System Exceptions
    public static readonly PRECONDITION_EXCEPTION = "Precondition Exception";
    public static readonly CLIENT_CREATION_EXCEPTION = "Client Creation Exception";
    public static readonly PROVISION_EXCEPTION = "Provision Exception";
    public static readonly CONFIG_UPDATING_EXCEPTION = "Config Updating Exception";
    public static readonly VALIDATION_EXCEPTION = "Validation Exception";
    public static readonly LIST_PUBLISHING_CREDENTIALS_EXCEPTION = "List Publishing Credentials Exception";
    public static readonly ZIP_DEPLOY_EXCEPTION = "Zip Deploy Exception";
    public static readonly MSG_ENDPOINT_UPDATING_EXCEPTION = "Message Endpoint Updating Exception";
    public static readonly DOWNLOAD_EXCEPTION = "Download Exception";
    public static readonly MANIFEST_FORMAT_EXCEPTION = "Template Manifest Format Exception";
    public static readonly TEMPLATE_PROJECT_NOT_FOUND_EXCEPTION = "Template Project Not Found Exception";
    public static readonly LANGUAGE_STRATEGY_NOT_FOUND_EXCEPTION = "Language Strategy Not Found Exception";
    public static readonly COMMAND_EXECUTION_EXCEPTION = "Command Execution Exception";

    // User Exceptions
    public static readonly USER_INPUTS_EXCEPTION = "User Inputs Exception";
    public static readonly PACK_DIR_EXISTENCE_EXCEPTION = "Pack Directory Existence Exception";
}

export class Links {
    public static readonly ISSUE_LINK = "https://github.com/OfficeDev/TeamsFx/issues/new";
    public static readonly HELP_LINK = "https://github.com/OfficeDev/TeamsFx/wiki";
}

export class Alias {
    public static readonly TEAMS_BOT_PLUGIN = "BP";
    public static readonly TEAMS_FX = "Teamsfx";
}

export class QuestionOptions {
    public static readonly WAY_TO_REGISTER_BOT_OPTIONS: OptionItem[] = [
        {
            id: WayToRegisterBot.CreateNew,
            label: "Create a new bot registration"
        },
        {
            id: WayToRegisterBot.ReuseExisting,
            label: "Reuse an existing bot registration"
        }
    ];

    public static readonly PROGRAMMING_LANGUAGE_OPTIONS: OptionItem[] = Object.values(ProgrammingLanguage).map((value) => {
        return {
            id: value,
            label: value
        };
    });
}

export class AuthEnvNames {
    public static readonly BOT_ID = "BOT_ID";
    public static readonly BOT_PASSWORD = "BOT_PASSWORD";
    public static readonly M365_CLIENT_ID = "M365_CLIENT_ID";
    public static readonly M365_CLIENT_SECRET = "M365_CLIENT_SECRET";
    public static readonly M365_TENANT_ID = "M365_TENANT_ID";
    public static readonly M365_AUTHORITY_HOST = "M365_AUTHORITY_HOST";
    public static readonly INITIATE_LOGIN_ENDPOINT = "INITIATE_LOGIN_ENDPOINT";
    public static readonly M365_APPLICATION_ID_URI = "M365_APPLICATION_ID_URI";
}

export class AuthValues {
    public static readonly M365_AUTHORITY_HOST = "https://login.microsoftonline.com";
}

export class DeployConfigs {
    public static readonly UN_PACK_DIRS = ["node_modules"];
}

export class FolderNames {
    public static readonly NODE_MODULES = "node_modules";
    public static readonly KEYTAR = "keytar";
}