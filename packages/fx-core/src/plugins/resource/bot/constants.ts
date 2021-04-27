// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { WayToRegisterBot } from "./enums/wayToRegisterBot";
import { OptionItem, ConfigFolderName } from "fx-api";
import { ProgrammingLanguage } from "./enums/programmingLanguage";

export class RegularExprs {
    public static readonly NORMAL_NAME: RegExp = /^[a-zA-Z0-9\-]{2,60}$/;
    public static readonly CHARS_TO_BE_SKIPPED: RegExp = /[^a-zA-Z0-9]/g;
}

export class WebAppConstants {
    public static readonly WEB_APP_SITE_DOMAIN: string = "azurewebsites.net";
    public static readonly APP_SERVICE_PLAN_DEFAULT_SKU_NAME = "F1";
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
    public static readonly SCAFFOLD_TITLE: string = "Scaffolding bot";
    public static readonly SCAFFOLD_STEP_START = "Scaffolding bot.";
    public static readonly SCAFFOLD_STEP_FETCH_ZIP = "Retrieving templates.";
    public static readonly SCAFFOLD_STEP_UNZIP = "Extracting templates target folder.";

    public static readonly SCAFFOLD_STEPS_NUM: number = 2;

    public static readonly PROVISION_TITLE: string = "Provisioning bot";
    public static readonly PROVISION_STEP_START = "Provisioning bot.";
    public static readonly PROVISION_STEP_BOT_REG = "Registering bot.";
    public static readonly PROVISION_STEP_WEB_APP = "Provisioning Azure Web App.";

    public static readonly PROVISION_STEPS_NUM: number = 2;

    public static readonly LOCAL_DEBUG_TITLE: string = "Local debugging";
    public static readonly LOCAL_DEBUG_STEP_START = "Provisioning bot for local debug.";
    public static readonly LOCAL_DEBUG_STEP_BOT_REG = "Registering bot.";

    public static readonly LOCAL_DEBUG_STEPS_NUM: number = 1;

    public static readonly DEPLOY_TITLE: string = "Deploying bot";
    public static readonly DEPLOY_STEP_START = "Deploying bot.";
    public static readonly DEPLOY_STEP_NPM_INSTALL = "Installing dependencies.";
    public static readonly DEPLOY_STEP_ZIP_FOLDER = "Creating application package."
    public static readonly DEPLOY_STEP_ZIP_DEPLOY = "Uploading application package.";

    public static readonly DEPLOY_STEPS_NUM: number = 3;

}

export class QuestionNames {
    public static readonly PROGRAMMING_LANGUAGE = "programming-language";
    public static readonly WAY_TO_REGISTER_BOT = "way-to-register-bot";
    public static readonly GET_BOT_ID = "bot-id";
    public static readonly GET_BOT_PASSWORD = "bot-password";
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
    public static readonly CHECK_AAD_APP = "checkAADApp";
}

export class Retry {
    public static readonly RETRY_TIMES = 10;
    public static readonly BACKOFF_TIME_MS = 5000;
}

export class ErrorNames {
    // System Exceptions
    public static readonly PRECONDITION_ERROR = "PreconditionError";
    public static readonly CLIENT_CREATION_ERROR = "ClientCreationError";
    public static readonly PROVISION_ERROR = "ProvisionError";
    public static readonly CONFIG_UPDATING_ERROR = "ConfigUpdatingError";
    public static readonly VALIDATION_ERROR = "ValidationError";
    public static readonly LIST_PUBLISHING_CREDENTIALS_ERROR = "ListPublishingCredentialsError";
    public static readonly ZIP_DEPLOY_ERROR = "ZipDeployError";
    public static readonly MSG_ENDPOINT_UPDATING_ERROR = "MessageEndpointUpdatingError";
    public static readonly DOWNLOAD_ERROR = "DownloadError";
    public static readonly MANIFEST_FORMAT_ERROR = "TemplateManifestFormatError";
    public static readonly TEMPLATE_PROJECT_NOT_FOUND_ERROR = "TemplateProjectNotFoundError";
    public static readonly LANGUAGE_STRATEGY_NOT_FOUND_ERROR = "LanguageStrategyNotFoundError";
    public static readonly COMMAND_EXECUTION_ERROR = "CommandExecutionError";
    public static readonly CALL_APPSTUDIO_API_ERROR = "CallAppStudioAPIError";

    // User Exceptions
    public static readonly USER_INPUTS_ERROR = "UserInputsError";
    public static readonly PACK_DIR_EXISTENCE_ERROR = "PackDirectoryExistenceError";
}

export class Links {
    public static readonly ISSUE_LINK = "https://github.com/OfficeDev/TeamsFx/issues/new";
    public static readonly HELP_LINK = "https://github.com/OfficeDev/TeamsFx/wiki";
}

export class Alias {
    public static readonly TEAMS_BOT_PLUGIN = "BT";
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
            label: "Use an existing bot registration"
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
    public static readonly SQL_ENDPOINT = "SQL_ENDPOINT";
    public static readonly SQL_DATABASE_NAME = "SQL_DATABASE_NAME";
    public static readonly SQL_USER_NAME = "SQL_USER_NAME";
    public static readonly SQL_PASSWORD = "SQL_PASSWORD";
    public static readonly IDENTITY_ID = "IDENTITY_ID";
    public static readonly API_ENDPOINT = "API_ENDPOINT";
}

export class AuthValues {
    public static readonly M365_AUTHORITY_HOST = "https://login.microsoftonline.com";
}

export class DeployConfigs {
    public static readonly UN_PACK_DIRS = ["node_modules", "package-lock.json"];
    public static readonly DEPLOYMENT_FOLDER = ".deployment";
    public static readonly DEPLOYMENT_CONFIG_FILE = "bot.json";
    public static readonly WALK_SKIP_PATHS = ["node_modules", `.${ConfigFolderName}`, DeployConfigs.DEPLOYMENT_FOLDER, ".vscode"];
}

export class FolderNames {
    public static readonly NODE_MODULES = "node_modules";
    public static readonly KEYTAR = "keytar";
}

export class TypeNames {
    public static readonly NUMBER = "number";
}