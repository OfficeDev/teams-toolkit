// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosRequestConfig } from "axios";

export interface IAuthProvider {
  ConfigureAxiosRequestWithAuthenticationInfo: (config: AxiosRequestConfig) => Promise<void>;
}
