// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AuthenticationConfiguration } from "../models/configuration";
import { Component } from "../container/types";
import { TeamsUserCredential } from "./teamsUserCredential.browser";
import { UserInfo } from "../models/userinfo";

export function userCredential(config: AuthenticationConfiguration): Component {
  return new TeamsUserCredential(config);
}

export type UserCredentialType = {
  getUserInfo(): Promise<UserInfo>;
};
