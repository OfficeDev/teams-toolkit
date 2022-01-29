// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Messages } from "../resources/messages";
import { IProgress } from "../utils/progress-helper";

export const ScaffoldProgress: IProgress = {
  title: Messages.ScaffoldProgressTitle,
  steps: {
    Scaffold: Messages.ProgressScaffold,
  },
};

export const PostProvisionProgress: IProgress = {
  title: Messages.PostProvisionProgressTitle,
  steps: {
    EnableStaticWebsite: Messages.ProgressEnableStorageStaticWebsite,
  },
};

export const PreDeployProgress: IProgress = {
  title: Messages.PreDeployProgressTitle,
  steps: {
    CheckStorage: Messages.ProgressCheckStorage,
  },
};

export const DeployProgress: IProgress = {
  title: Messages.DeployProgressTitle,
  steps: {
    NPMInstall: Messages.ProgressNPMInstall,
    Build: Messages.ProgressBuild,
    getSrcAndDest: Messages.ProgressGetSrcAndDest,
    Clear: Messages.ProgressClear,
    Upload: Messages.ProgressUpload,
  },
};

export const MigrateProgress: IProgress = {
  title: Messages.MigrateProgressTitle,
  steps: {
    Migrate: Messages.ProgressMigrate,
  },
};
