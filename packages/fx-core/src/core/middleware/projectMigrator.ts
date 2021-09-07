// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConfigFolderName, err, FxError, Inputs, ok } from "@microsoft/teamsfx-api";
import { CoreHookContext } from "../..";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";

export const ProjectMigratorMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  await next();
};
