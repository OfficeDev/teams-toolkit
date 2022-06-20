// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { createContextV3 } from "../../../../src/component/utils";
import { SqlClient } from "../../../../src/component/resource/azureSql/clients/sql";
import { MockTools, randomAppName } from "../../../core/utils";
import { setTools } from "../../../../src/core/globalVars";
import sinon from "sinon";
import { ErrorMessage } from "../../../../src/component/resource/azureSql/errors";
import { AzureSqlResource } from "../../../../src/component/resource/azureSql";
import { getLocalizedString } from "../../../../src/common/localizeUtils";
import { ContextV3, FunctionAction, InputsWithProjectPath, Platform } from "@microsoft/teamsfx-api";
import { ComponentNames } from "../../../../src/component/constants";
import { Constants } from "../../../../src/component/resource/azureSql/constants";
import { newEnvInfoV3 } from "../../../../src";
import path from "path";
import * as os from "os";
import faker from "faker";
import { TokenCredential } from "@azure/core-http";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { FirewallRules, ServerAzureADAdministrators } from "@azure/arm-sql";
import axios from "axios";
import { TokenResponse } from "adal-node/lib/adal";
import { TokenInfo, UserType } from "../../../../src/component/resource/azureSql/utils/common";
import * as Common from "../../../../src/component/resource/azureSql/utils/common";
import { AzureFunctionResource } from "../../../../src/component/resource/azureFunction";

chai.use(chaiAsPromised);

describe("Azure-Function Component", () => {
  const tools = new MockTools();
  const sandbox = sinon.createSandbox();
  const component = new AzureFunctionResource();
  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  const inputs: InputsWithProjectPath = {
    projectPath: projectPath,
    platform: Platform.VSCode,
    "app-name": appName,
  };
  let context: ContextV3;
  setTools(tools);

  beforeEach(async () => {
    context = createContextV3();
    context.envInfo = newEnvInfoV3();
  });
  afterEach(() => {
    sandbox.restore();
  });

  it("configure happy path", async function () {
    const configureAction = await component.configure(context, inputs);
    chai.assert.isTrue(configureAction.isOk());
    const action = configureAction._unsafeUnwrap() as FunctionAction;
    const result = await action.execute(context, inputs);
    chai.assert.isTrue(result.isOk());
  });

  it("generateBicep happy path", async function () {
    const generateBicepAction = await component.generateBicep(context, inputs);
    chai.assert.isTrue(generateBicepAction.isOk());
    const action = generateBicepAction._unsafeUnwrap() as FunctionAction;
    const result = await action.execute(context, inputs);
    chai.assert.isTrue(result.isOk());
  });
});
