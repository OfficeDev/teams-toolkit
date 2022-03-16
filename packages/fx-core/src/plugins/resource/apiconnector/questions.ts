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

export const apiPasswordQuestion: TextInputQuestion = {
  name: Constants.questionKey.apiPassword,
  title: getLocalizedString("plugins.apiConnector.getQuestionApiPassword.title"),
  type: "text",
  password: true,
};

export const botOption: OptionItem = {
  id: "bot service",
  label: "bot",
  detail: getLocalizedString("plugins.apiConnector.botOption.detail"),
};

export const functionOption: OptionItem = {
  id: "api service",
  label: "api",
  detail: getLocalizedString("plugins.apiConnector.functionOption.detail"),
};

export const BasicAuthOption: OptionItem = {
  id: "basic",
  label: "Basic Authentication",
  detail: "basic authentication",
};

export const CertAuthOption: OptionItem = {
  id: "cert",
  label: "Certification Authentication",
  detail: "Certification authentication",
};

export const AADAuthOption: OptionItem = {
  id: "aad",
  label: "Azure Active Directory Authentication",
  detail: "AAD authentication",
};

export const APIKeyAuthOption: OptionItem = {
  id: "APIkey",
  label: "API Key Authentication",
  detail: "API key authentication",
};

export const OtherAuthOPtion: OptionItem = {
  id: "other",
  label: "Self define Authentication",
  detail: "Authentication self define",
};
