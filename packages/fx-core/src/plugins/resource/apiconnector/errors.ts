// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { getLocalizedString } from "../../../common/localizeUtils";

export interface ApiConnectorError {
  name: string;
  message: (...args: string[]) => string;
  helpLink?: string;
}
