// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { CliConfigRunFrom } from "../../telemetry/cliTelemetryEvents";

export function tryDetectCICDPlatform(): CliConfigRunFrom {
  if (process.env.GITHUB_ACTIONS === "true") {
    // https://docs.github.com/cn/actions/learn-github-actions/environment-variables#default-environment-variables
    return CliConfigRunFrom.GitHub;
  } else if (process.env.JENKINS_URL && process.env.BUILD_URL) {
    // https://www.jenkins.io/doc/book/pipeline/jenkinsfile/#using-environment-variables
    // Same logic compared with AzDo.
    return CliConfigRunFrom.Jenkins;
  } else if (process.env.BUILD_SOURCEBRANCHNAME && process.env.AGENT_BUILDDIRECTORY) {
    // https://docs.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops&tabs=yaml
    // Not found any pre-defined env var to indicate cli is running in Azure DevOps pipelines.
    // Just using two pre-defined env vars here so there should be very low possibility that they coexisted when not in AzDo.
    return CliConfigRunFrom.AzDo;
  } else {
    return CliConfigRunFrom.Other;
  }
}
