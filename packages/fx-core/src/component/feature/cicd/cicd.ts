// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ContextV3, err, FxError, InputsWithProjectPath, ok, Result } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { ComponentNames } from "../../constants";
import { CICDImpl } from "./CICDImpl";
import { questionNames } from "./questions";
@Service(ComponentNames.CICD)
export class CICD {
  name = ComponentNames.CICD;

  async add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const cicdImpl: CICDImpl = new CICDImpl();
    const envName = inputs.env || inputs[questionNames.Environment];
    const res = await cicdImpl.addCICDWorkflows(context, inputs, envName);
    if (res.isErr()) return err(res.error);
    return ok(undefined);
  }
}
