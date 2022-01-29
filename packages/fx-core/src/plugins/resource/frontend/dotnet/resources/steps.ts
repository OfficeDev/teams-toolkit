// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IProgress } from "../../utils/progress-helper";
import { ProgressMessages, ProgressTitle } from "./messages";

export const WebappDeployProgress: IProgress = {
  title: ProgressTitle.DeployProgressTitle,
  steps: {
    build: ProgressMessages.Build,
    generateZip: ProgressMessages.GenerateZip,
    fetchCredential: ProgressMessages.FetchCredential,
    deploy: ProgressMessages.Deploy,
  },
};
