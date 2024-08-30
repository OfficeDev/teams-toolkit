// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import path from "path";
import { LocalDebugTaskLabel, TemplateProject } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";
import { SampledebugContext } from "./sampledebugContext";
import { editDotEnvFile } from "../../utils/commonUtils";

class RedditLinkTestCase extends CaseFactory {
  public override async onAfterCreate(
    sampledebugContext: SampledebugContext,
    env: "local" | "dev"
  ): Promise<void> {
    const envUserFilePath = path.resolve(
      sampledebugContext.projectPath,
      "env",
      `.env.${env}.user`
    );
    editDotEnvFile(envUserFilePath, "SECRET_REDDIT_PASSWORD", "fake");
    const envFilePath = path.resolve(
      sampledebugContext.projectPath,
      "env",
      `.env.${env}`
    );
    editDotEnvFile(envFilePath, "REDDIT_ID", "fake");
  }
}

new RedditLinkTestCase(
  TemplateProject.RedditLink,
  27851434,
  "v-ivanchen@microsoft.com",
  "local",
  [LocalDebugTaskLabel.StartLocalTunnel, LocalDebugTaskLabel.StartApplication],
  {
    skipValidation: true,
    repoPath: "./resource/samples/msgext-link-unfurling-reddit",
  }
).test();
