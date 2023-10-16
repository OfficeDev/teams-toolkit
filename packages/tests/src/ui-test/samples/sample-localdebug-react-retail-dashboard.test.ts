// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";
import { Page } from "playwright";
import { initTeamsPage } from "../../utils/playwrightOperation";
import { SampledebugContext } from "./sampledebugContext";
import { Env } from "../../utils/env";

class RetailDashboardTestCase extends CaseFactory {
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

new RetailDashboardTestCase(
  TemplateProject.QueryOrg,
  25051148,
  "v-ivanchen@microsoft.com",
  "local",
  [LocalDebugTaskLabel.GulpServe],
  {
    teamsAppName: "react-retail-dashboard-local",
    type: "spfx",
    skipValidation: true,
  }
).test();
