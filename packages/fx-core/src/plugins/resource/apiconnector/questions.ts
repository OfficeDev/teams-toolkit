// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import {
  Inputs,
  LogProvider,
  OptionItem,
  PluginContext,
  TelemetryReporter,
  Question,
  ValidationSchema,
  TextInputQuestion,
} from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import { AuthType, Constants } from "./constants";
import { getLocalizedString } from "../../../common/localizeUtils";
import {
  checkApiNameExist,
  checkApiNameValid,
  checkEmptyValue,
  checkHttp,
  checkIsGuid,
} from "./checker";

export interface IQuestionService {
  // Control whether the question is displayed to the user.
  condition?(parentAnswerPath: string): { target?: string } & ValidationSchema;
  // Generate the question
  getQuestion(ctx: PluginContext): Question;
}

export class BaseQuestionService {
  protected readonly logger: LogProvider | undefined;
  protected readonly telemetryReporter: TelemetryReporter | undefined;

  constructor(telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
    this.telemetryReporter = telemetryReporter;
    this.logger = logger;
  }
}
export class ApiNameQuestion extends BaseQuestionService implements IQuestionService {
  protected readonly ctx: Context | undefined;
  constructor(ctx?: Context, telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
    super(telemetryReporter, logger);
    this.ctx = ctx;
  }

  public getQuestion(): TextInputQuestion {
    return {
      type: "text",
      name: Constants.questionKey.apiName,
      title: getLocalizedString("plugins.apiConnector.getQuestionApiName.title"),
      placeholder: getLocalizedString("plugins.apiConnector.getQuestionApiName.placeholder"),
      validation: {
        validFunc: async (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
          const languageType: string = this.ctx?.projectSetting.programmingLanguage as string;
          const components: string[] = previousInputs![
            Constants.questionKey.componentsSelect
          ] as string[];
          return (
            (await checkEmptyValue(input)) ||
            (await checkApiNameExist(
              input,
              previousInputs?.projectPath as string,
              components,
              languageType
            )) ||
            checkApiNameValid(input)
          );
        },
      },
    };
  }
}

export const apiEndpointQuestion: TextInputQuestion = {
  name: Constants.questionKey.endpoint,
  title: getLocalizedString("plugins.apiConnector.getQuestionEndpoint.title"),
  type: "text",
  placeholder: getLocalizedString("plugins.apiConnector.getQuestionEndpoint.placeholder"), // Use the placeholder to display some description
  validation: {
    validFunc: checkHttp,
  },
};

export const basicAuthUsernameQuestion: TextInputQuestion = {
  name: Constants.questionKey.apiUserName,
  title: getLocalizedString("plugins.apiConnector.getQuestion.basicAuth.userName.title"),
  type: "text",
  placeholder: getLocalizedString(
    "plugins.apiConnector.getQuestion.basicAuth.userName.placeholder"
  ), // Use the placeholder to display some description
  validation: {
    validFunc: checkEmptyValue,
  },
};

export const appTenantIdQuestion: TextInputQuestion = {
  name: Constants.questionKey.apiAppTenentId,
  title: getLocalizedString("plugins.apiConnector.appTenantId.title"),
  type: "text",
  placeholder: getLocalizedString("plugins.apiConnector.appTenantId.placeholder"), // Use the placeholder to display some description
  validation: {
    validFunc: checkIsGuid,
  },
};

export const appIdQuestion: TextInputQuestion = {
  name: Constants.questionKey.apiAppId,
  title: getLocalizedString("plugins.apiConnector.appId.title"),
  type: "text",
  placeholder: getLocalizedString("plugins.apiConnector.appId.placeholder"), // Use the placeholder to display some description
  validation: {
    validFunc: checkIsGuid,
  },
};

export function buildAPIKeyNameQuestion(): TextInputQuestion {
  return {
    name: Constants.questionKey.apiAPIKeyName,
    title: getLocalizedString("plugins.apiConnector.getQuestion.apiKeyName.title"),
    type: "text",
    placeholder: getLocalizedString("plugins.apiConnector.getQuestion.apiKeyName.placeholder"), // Use the placeholder to display some description
    validation: {
      validFunc: checkEmptyValue,
    },
  };
}

export const reuseAppOption: OptionItem = {
  id: "existing",
  label: getLocalizedString("plugins.apiConnector.reuseAppOption.title"),
};

export const anotherAppOption: OptionItem = {
  id: "custom",
  label: getLocalizedString("plugins.apiConnector.anotherAppOption.title"),
};

export const requestHeaderOption: OptionItem = {
  id: "header",
  label: getLocalizedString("plugins.apiConnector.requestHeaderOption.title"),
};

export const queryParamsOption: OptionItem = {
  id: "querystring",
  label: getLocalizedString("plugins.apiConnector.queryParamsOption.title"),
};

export const botOption: OptionItem = {
  id: "bot",
  label: getLocalizedString("plugins.apiConnector.botOption.title"),
  detail: "./bot",
};

export const functionOption: OptionItem = {
  id: "api",
  label: getLocalizedString("plugins.apiConnector.functionOption.title"),
  detail: "./api",
};

export const BasicAuthOption: OptionItem = {
  id: AuthType.BASIC,
  label: "Basic",
  detail: getLocalizedString("plugins.apiConnector.BasicAuthOption.detail"),
};

export const CertAuthOption: OptionItem = {
  id: AuthType.CERT,
  label: "Certification",
  detail: getLocalizedString("plugins.apiConnector.CertAuthOption.detail"),
};

export const AADAuthOption: OptionItem = {
  id: AuthType.AAD,
  label: "Azure Active Directory",
  detail: getLocalizedString("plugins.apiConnector.AADAuthOption.detail"),
};

export const APIKeyAuthOption: OptionItem = {
  id: AuthType.APIKEY,
  label: "API Key",
  detail: getLocalizedString("plugins.apiConnector.APIKeyOption.detail"),
};

export const ImplementMyselfOption: OptionItem = {
  id: AuthType.CUSTOM,
  label: "Custom Auth Implementation",
  detail: getLocalizedString("plugins.apiConnector.ImplementMyselfOption.detail"),
};
