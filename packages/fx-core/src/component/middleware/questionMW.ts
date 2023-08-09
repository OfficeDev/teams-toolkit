// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext, Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { Inputs, err } from "@microsoft/teamsfx-api";
import { TOOLS } from "../../core/globalVars";
import { QuestionNodes, questionNodes } from "../../question";
import { traverse } from "../../ui/visitor";

export function QuestionMW(key: keyof QuestionNodes): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const inputs = ctx.arguments[0] as Inputs;
    const node = questionNodes[key]();
    const askQuestionRes = await traverse(node, inputs, TOOLS.ui, TOOLS.telemetryReporter);
    if (askQuestionRes.isErr()) {
      ctx.result = err(askQuestionRes.error);
      return;
    }
    await next();
  };
}
