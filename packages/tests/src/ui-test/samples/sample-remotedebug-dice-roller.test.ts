// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";
import { initTeamsPage } from "../../utils/playwrightOperation";
import { Env } from "../../utils/env";
import { SampledebugContext } from "./sampledebugContext";

class DiceRollerTestCase extends CaseFactory {
  public override async onInitPage(
    sampledebugContext: SampledebugContext,
    teamsAppId: string,
    options?: {
      teamsAppName: string;
      type: string;
    }
  ): Promise<Page> {
    return await initTeamsPage(
      sampledebugContext.context!,
      teamsAppId,
      Env.username,
      Env.password,
      {
        teamsAppName: options?.teamsAppName,
        type: options?.type,
      }
    );
  }
}

new DiceRollerTestCase(
  TemplateProject.DiceRoller,
  24121529,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  { skipValidation: true, type: "meeting" }
).test();
