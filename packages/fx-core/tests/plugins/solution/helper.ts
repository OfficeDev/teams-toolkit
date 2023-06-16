import {
  Context,
  FxError,
  ok,
  PluginContext,
  Result,
  SubscriptionInfo,
  Void,
} from "@microsoft/teamsfx-api";
import os from "os";
import path from "path";
import sinon from "sinon";
import { createContextV3 } from "../../../src/component/utils";
import { newEnvInfoV3 } from "../../../src/core/environment";
import { MyTokenCredential } from "./util";

export class TestHelper {
  static appName = "ut_app_name";
  static rootDir = path.join(__dirname, "ut");
  static resourceBaseName = "utappnamedefa000000";
  static resourceNameSuffix = "-ut";
  static resourceGroupName = "ut_rg";
  static subscriptionId = "11111111-2222-3333-4444-555555555555";
  static subscriptionName = "ut_subscription_name";
  static clientId = "ut_client_id";
  static clientSecret = "ut_client_secret";
  static domain = "ut_domain";
  static username = "ut_username";
  static password = "ut_password";
  static envName = "default";
  static envVariable = "ut_env_variable_value";

  static frontendhostingOutputValue = "frontend_hosting_output_value";
  static identityOutputValue = "identity_output_value";
  static simpleAuthOutputValue = "simple_auth_output_value";
  static armTemplateJson = `{"test_key": "test_value"}`;

  static mockContextV3(): Context {
    const ctx = createContextV3();
    const envInfo = newEnvInfoV3();
    envInfo.state.solution = {
      resourceBaseName: TestHelper.resourceBaseName,
      resourceGroupName: TestHelper.resourceGroupName,
      resourceNameSuffix: TestHelper.resourceNameSuffix,
      subscriptionId: TestHelper.subscriptionId,
    };
    ctx.envInfo = envInfo;
    return ctx;
  }

  static getMockedDeployCtx(mockedCtx: Context): any {
    return {
      resourceGroupName: "poll-deployment-rg",
      deploymentName: "poll-deployment",
      finished: false,
      deploymentStartTime: Date.now(),
      ctx: mockedCtx,
      client: undefined,
    };
  }

  static mockArmDeploymentDependencies(mockedCtx: Context, mocker: sinon.SinonSandbox) {
    mockedCtx.tokenProvider!.azureAccountProvider!.getIdentityCredentialAsync = async function () {
      return new MyTokenCredential();
    };
    mockedCtx.tokenProvider!.azureAccountProvider!.getSelectedSubscription = async function () {
      const subscriptionInfo = {
        subscriptionId: TestHelper.subscriptionId,
        subscriptionName: TestHelper.subscriptionName,
      } as SubscriptionInfo;
      return subscriptionInfo;
    };
  }

  static mockScaffoldThatAlwaysSucceed(plugin: any) {
    plugin.preScaffold = async function (_ctx: PluginContext): Promise<Result<any, FxError>> {
      return ok(Void);
    };
    plugin.scaffold = async function (_ctx: PluginContext): Promise<Result<any, FxError>> {
      return ok(Void);
    };
    plugin.postScaffold = async function (_ctx: PluginContext): Promise<Result<any, FxError>> {
      return ok(Void);
    };
  }

  static getParameterFileContent(
    provisionParameters: Record<string, string>,
    customizedParameters?: Record<string, string>
  ): string {
    const params = Object.assign(
      { provisionParameters: { value: provisionParameters } },
      customizedParameters
    );
    const parameterObject = {
      $schema: "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
      contentVersion: "1.0.0.0",
      parameters: params,
    };
    return JSON.stringify(parameterObject, undefined, 2).replace(/\r?\n/g, os.EOL);
  }
}
