// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import * as fs from "fs-extra";
import { TextInputQuestion, OptionItem, Inputs } from "@microsoft/teamsfx-api";
import { Constants } from "./constants";
import { getLocalizedString } from "../../../common/localizeUtils";

export const apiNameQuestion: TextInputQuestion = {
  name: Constants.questionKey.apiName,
  title: getLocalizedString("plugins.apiConnector.getQuestionApiName.title"),
  type: "text",
  validation: {
    validFunc: async (input: string, previousInputs?: Inputs): Promise<string | undefined> => {
      const apiNames = previousInputs![Constants.questionKey.componentsSelect] as string[];
      apiNames.forEach(async (item) => {});
      return res;
    },
  },
};

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
