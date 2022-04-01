// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import * as fs from "fs-extra";
import path from "path";
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
import { Constants } from "./constants";
import { getLocalizedString } from "../../../common/localizeUtils";
import { checkApiNameExist } from "./checker";
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
      validation: {
        validFunc: async (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
          const languageType: string = this.ctx?.projectSetting.programmingLanguage as string;
          const components: string[] = previousInputs![
            Constants.questionKey.componentsSelect
          ] as string[];
          return await checkApiNameExist(
            input,
            previousInputs?.projectPath as string,
            components,
            languageType
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
};

export const apiTypeQuestion: TextInputQuestion = {
  name: Constants.questionKey.apiType,
  title: getLocalizedString("plugins.apiConnector.getQuestionApiType.title"),
  type: "text",
};

export const apiLoginUserNameQuestion: TextInputQuestion = {
  name: Constants.questionKey.apiUserName,
  title: getLocalizedString("plugins.apiConnector.getQuestionApiUserName.title"),
  type: "text",
};

export const botOption: OptionItem = {
  id: "bot",
  label: "bot",
  detail: getLocalizedString("plugins.apiConnector.botOption.detail"),
};

export const functionOption: OptionItem = {
  id: "api",
  label: "api",
  detail: getLocalizedString("plugins.apiConnector.functionOption.detail"),
};

export const BasicAuthOption: OptionItem = {
  id: "basic",
  label: "Basic Authentication",
  detail: getLocalizedString("plugins.apiConnector.BasicAuthOption.detail"),
};

export const CertAuthOption: OptionItem = {
  id: "cert",
  label: "Certification Authentication",
  detail: getLocalizedString("plugins.apiConnector.CertAuthOption.detail"),
};

export const AADAuthOption: OptionItem = {
  id: "aad",
  label: "Azure Active Directory Authentication",
  detail: getLocalizedString("plugins.apiConnector.AADAuthOption.detail"),
};

export const APIKeyAuthOption: OptionItem = {
  id: "APIkey",
  label: "API Key Authentication",
  detail: getLocalizedString("plugins.apiConnector.APIKeyOption.detail"),
};

export const ImplementMyselfOption: OptionItem = {
  id: "ImplementMyself",
  label: "Implement authentication by myself",
  detail: getLocalizedString("plugins.apiConnector.ImplementMyselfOption.detail"),
};
