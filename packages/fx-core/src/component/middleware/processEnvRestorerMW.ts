// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Middleware, NextFunction } from "@feathersjs/hooks";
import { CoreHookContext } from "../../core/types";
import _ from "lodash";

export const ProcessEnvRestorerMW: Middleware = async (
  ctx: CoreHookContext,
  next: NextFunction
) => {
  const envBefore = _.cloneDeep(process.env);
  try {
    await next();
  } finally {
    process.env = envBefore;
  }
};
