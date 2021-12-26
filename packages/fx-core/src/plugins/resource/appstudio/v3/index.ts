// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  Result,
  ok,
  err,
  v2,
  IComposeExtension,
  IBot,
  IConfigurableTab,
  IStaticTab,
  TeamsAppManifest,
  Void,
  AppStudioTokenProvider,
  v3,
  UserError,
  SystemError,
} from "@microsoft/teamsfx-api";
import { BuiltInResourcePluginNames } from "../../../solution/fx-solution/v3/constants";
import { Service } from "typedi";
import { TeamsAppResource, TeamsFxAzureResourceStates } from "../../../../../../api/build/v3";
import { SolutionError, SolutionSource } from "../../../solution/fx-solution/constants";

@Service(BuiltInResourcePluginNames.appStudio)
export class AppStudioPluginV3 {
  // Generate initial manifest template file, for both local debug & remote
  async init(ctx: v2.Context, inputs: v2.InputsWithProjectPath): Promise<Result<any, FxError>> {
    return ok(undefined);
  }

  // Append to manifest template file
  async addCapabilities(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    capabilities: (
      | { name: "staticTab"; snippet?: IStaticTab }
      | { name: "configurableTab"; snippet?: IConfigurableTab }
      | { name: "Bot"; snippet?: IBot }
      | { name: "MessageExtension"; snippet?: IComposeExtension }
    )[]
  ): Promise<Result<any, FxError>> {
    capabilities.map((capability) => {
      if (this.capabilityExceedLimit(ctx, inputs, capability.name)) {
        return err(new Error("Exeed limit."));
      }
    });
    return ok(undefined);
  }

  // Read from manifest template, and check if it exceeds the limit.
  // The limit of staticTab if 16, others are 1
  // Should check both local & remote manifest template file
  public async capabilityExceedLimit(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension"
  ): Promise<boolean> {
    return false;
  }

  // load manifest templates
  public async readManifest(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<{ remote: TeamsAppManifest; local: TeamsAppManifest }, FxError>> {
    return ok({ remote: new TeamsAppManifest(), local: new TeamsAppManifest() });
  }

  public async writeManifest(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    manifest: { remote: TeamsAppManifest; local: TeamsAppManifest }
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }

  async checkM365Tenant(
    envInfo: v3.EnvInfoV3,
    appStudioTokenProvider: AppStudioTokenProvider
  ): Promise<Result<Void, FxError>> {
    await appStudioTokenProvider.getAccessToken();
    const appResource = envInfo.state[BuiltInResourcePluginNames.appStudio] as TeamsAppResource;
    const m365TenantId = appResource.tenantId;
    if (!m365TenantId) {
      return ok(Void);
    }
    const appstudioTokenJson = await appStudioTokenProvider.getJsonObject();
    if (appstudioTokenJson === undefined) {
      return err(
        new SystemError(
          SolutionError.NoAppStudioToken,
          "Graph token json is undefined",
          SolutionSource
        )
      );
    }
    const teamsAppTenantId = (appstudioTokenJson as any).tid;
    if (
      teamsAppTenantId === undefined ||
      !(typeof teamsAppTenantId === "string") ||
      teamsAppTenantId.length === 0
    ) {
      return err(
        new SystemError(
          SolutionError.NoTeamsAppTenantId,
          "Cannot find Teams app tenant id",
          SolutionSource
        )
      );
    }
    if (teamsAppTenantId !== m365TenantId) {
      return err(
        new UserError(
          SolutionError.TeamsAppTenantIdNotRight,
          `The signed in M365 account does not match the M365 tenant used in previous provision for '${envInfo.envName}' environment. Please sign out and sign in with the correct M365 account.`,
          "Solution"
        )
      );
    }
    appResource.tenantId = teamsAppTenantId;
    return ok(Void);
  }
}
