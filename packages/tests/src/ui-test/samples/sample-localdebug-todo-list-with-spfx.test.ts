// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import { initTeamsPage } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { SampledebugContext } from "./sampledebugContext";
import { validateTodoList } from "../../utils/playwrightOperation";
import { Env } from "../../utils/env";

class TodoListSpfxTestCase extends CaseFactory {
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
  override async onValidate(page: Page): Promise<void> {
    return await validateTodoList(page);
  }
}

new TodoListSpfxTestCase(
  TemplateProject.TodoListSpfx,
  9958516,
  "v-ivanchen@microsoft.com",
  "local",
  [LocalDebugTaskLabel.GulpServe],
  {
    teamsAppName: "TodoListSPFx-local",
    type: "spfx",
  }
).test();
