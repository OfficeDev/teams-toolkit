// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { TextInputQuestion, OptionItem } from "@microsoft/teamsfx-api";
import { Constants } from "./constants";
import { getLocalizedString } from "../../../common/localizeUtils";

export const apiNameQuestion: TextInputQuestion = {
  name: Constants.questionKey.apiName,
  title: getLocalizedString("plugins.apiConnector.getQuestionApiName.title"),
  type: "text",
  placeholder: getLocalizedString("plugins.apiConnector.getQuestionApiName.placeholder"), // Use the placeholder to display some description
};

export const apiEndpointQuestion: TextInputQuestion = {
  name: Constants.questionKey.endpoint,
  title: getLocalizedString("plugins.apiConnector.getQuestionEndpoint.title"),
  type: "text",
  placeholder: getLocalizedString("plugins.apiConnector.getQuestionEndpoint.placeholder"), // Use the placeholder to display some description
};

export const apiTypeQuestion: TextInputQuestion = {
  name: Constants.questionKey.apiType,
  title: getLocalizedString("plugins.apiConnector.getQuestionApiType.title"),
  type: "text",
};

export const apiLoginUserNameQuestion: TextInputQuestion = {
  name: Constants.questionKey.apiUserName,
  title: getLocalizedString("plugins.apiConnector.getQuestion.basicAuth.userName.title"),
  type: "text",
  placeholder: getLocalizedString(
    "plugins.apiConnector.getQuestion.basicAuth.userName.placeholder"
  ), // Use the placeholder to display some description
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
  id: "basic",
  label: "Basic",
  detail: getLocalizedString("plugins.apiConnector.BasicAuthOption.detail"),
};

export const CertAuthOption: OptionItem = {
  id: "cert",
  label: "Certification",
  detail: getLocalizedString("plugins.apiConnector.CertAuthOption.detail"),
};

export const AADAuthOption: OptionItem = {
  id: "aad",
  label: "Azure Active Directory",
  detail: getLocalizedString("plugins.apiConnector.AADAuthOption.detail"),
};

export const APIKeyAuthOption: OptionItem = {
  id: "APIkey",
  label: "API Key",
  detail: getLocalizedString("plugins.apiConnector.APIKeyOption.detail"),
};

export const ImplementMyselfOption: OptionItem = {
  id: "ImplementMyself",
  label: "Custom Auth Implementation",
  detail: getLocalizedString("plugins.apiConnector.ImplementMyselfOption.detail"),
};
