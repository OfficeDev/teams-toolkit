// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosRequestConfig } from "axios";

export interface IAuthProvider {
  AddAuthenticationInfo: (config: AxiosRequestConfig) => Promise<void>;
}
