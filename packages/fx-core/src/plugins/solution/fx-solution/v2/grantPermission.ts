import {
  AzureSolutionSettings,
  Colors,
  err,
  FxError,
  GraphTokenProvider,
  ok,
  Platform,
  PluginContext,
  Result,
  returnSystemError,
  returnUserError,
  SolutionContext,
  v2,
  Err,
  TokenProvider,
  TelemetryReporter,
  UserInteraction,
  LogProvider,
  ConfigMap,
  Json,
} from "@microsoft/teamsfx-api";
import {
  CollaborationState,
  isSPFxProject,
  PermissionsResult,
  ResourcePermission,
} from "../../../../common";
import { IUserList } from "../../../resource/appstudio/interfaces/IAppDefinition";
import {
  PluginNames,
  SolutionError,
  SolutionSource,
  SolutionTelemetryComponentName,
  SolutionTelemetryEvent,
  SolutionTelemetryProperty,
  SolutionTelemetrySuccess,
} from "../constants";
import { PluginsWithContext } from "../solution";
import { sendErrorTelemetryThenReturnError } from "../utils/util";
import { executeConcurrently, LifecyclesWithContext } from "../executor";
import {
  getActivatedResourcePlugins,
  getActivatedV2ResourcePlugins,
} from "../ResourcePluginContainer";
import { flattenConfigMap } from "../../../resource/utils4v2";
import { NamedThunk, executeConcurrently as executeNamedThunkConcurrently } from "./executor";
import { CollaborationUtil, CollabApiParam } from "./collaborationUtil";
import { getPluginAndContextArray } from "./utils";
import { REMOTE_TEAMS_APP_TENANT_ID } from "..";

async function grantPermissionImpl(
  param: CollabApiParam,
  envState: Map<string, any>,
  envName?: string,
  telemetryReporter?: TelemetryReporter,
  ui?: UserInteraction,
  graphTokenProvider?: GraphTokenProvider,
  logProvider?: LogProvider,
  platform?: string,
  email?: string
): Promise<Result<PermissionsResult, FxError>> {
  telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.GrantPermissionStart, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
  });

  const progressBar = ui?.createProgressBar("Granting permission", 1);
  try {
    const result = await CollaborationUtil.getCurrentUserInfo(graphTokenProvider);
    if (result.isErr()) {
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.GrantPermission,
          result.error,
          telemetryReporter
        )
      );
    }

    const stateResult = CollaborationUtil.getCurrentCollaborationState(envState, result.value);

    if (stateResult.state != CollaborationState.OK) {
      if (platform === Platform.CLI) {
        ui?.showMessage("warn", stateResult.message!, false);
      } else if (platform === Platform.VSCode) {
        logProvider?.warning(stateResult.message!);
      }
      return ok({
        state: stateResult.state,
        message: stateResult.message,
      });
    }

    if (!email || email === result.value.userPrincipalName) {
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.GrantPermission,
          returnUserError(
            new Error("Collaborator's email cannot be null or same as current user"),
            SolutionSource,
            SolutionError.EmailCannotBeEmptyOrSame
          ),
          telemetryReporter
        )
      );
    }

    const userInfo = await CollaborationUtil.getUserInfo(graphTokenProvider, email);

    if (!userInfo) {
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.GrantPermission,
          returnUserError(
            new Error(
              "Cannot find user in current tenant, please check whether your email address is correct"
            ),
            SolutionSource,
            SolutionError.CannotFindUserInCurrentTenant
          ),
          telemetryReporter
        )
      );
    }

    progressBar?.start();
    progressBar?.next(`Grant permission for user ${email}`);

    if (platform === Platform.CLI) {
      const aadAppTenantId = envState.get(PluginNames.SOLUTION)?.get(REMOTE_TEAMS_APP_TENANT_ID);
      if (!envName) {
        return err(
          sendErrorTelemetryThenReturnError(
            SolutionTelemetryEvent.GrantPermission,
            returnSystemError(
              new Error("Failed to get env name."),
              SolutionSource,
              SolutionError.FailedToGetEnvName
            ),
            telemetryReporter
          )
        );
      }

      const message = [
        { content: `Account to grant permission: `, color: Colors.BRIGHT_WHITE },
        { content: userInfo.userPrincipalName + "\n", color: Colors.BRIGHT_MAGENTA },
        {
          content: `Starting grant permission for environment: `,
          color: Colors.BRIGHT_WHITE,
        },
        { content: `${envName}\n`, color: Colors.BRIGHT_MAGENTA },
        { content: `Tenant ID: `, color: Colors.BRIGHT_WHITE },
        { content: aadAppTenantId + "\n", color: Colors.BRIGHT_MAGENTA },
      ];

      ui?.showMessage("info", message, false);
    }

    const [permissions, errors] =
      param.apiVersion === 1
        ? await executeGrantPermissionsV1(param.ctx, userInfo)
        : await executeGrantPermissionsV2(
            param.ctx,
            param.inputs,
            param.envInfo,
            param.tokenProvider,
            userInfo
          );

    let errorMsg = "";
    if (errors.length > 0) {
      errorMsg += `Failed to grant permission for the below resources to user: ${email}.\n Resource details: \n`;
      for (const fxError of errors) {
        errorMsg += fxError.error.message + "\n";
      }
    }

    if (platform === Platform.CLI) {
      for (const permission of permissions) {
        const message = [
          { content: `${permission.roles?.join(",")} `, color: Colors.BRIGHT_MAGENTA },
          { content: "permission has been granted to ", color: Colors.BRIGHT_WHITE },
          { content: permission.name, color: Colors.BRIGHT_MAGENTA },
          { content: ", Resource ID: ", color: Colors.BRIGHT_WHITE },
          { content: `${permission.resourceId}`, color: Colors.BRIGHT_MAGENTA },
        ];

        ui?.showMessage("info", message, false);
      }

      if (CollaborationUtil.isSpfxProject(param.ctx)) {
        ui?.showMessage(
          "info",
          `\nIf added user is not a SharePoint App Catalog site admin, you need to handle that via SharePoint admin center, please refer to this link for more details: https://docs.microsoft.com/en-us/sharepoint/manage-site-collection-administrators`,
          false
        );
      } else {
        ui?.showMessage(
          "info",
          `\nIf added user cannot access Azure resources, you need to handle that via Azure portal,  please refer to this link for more details: https://docs.microsoft.com/en-us/azure/role-based-access-control/role-assignments-portal?tabs=current`,
          false
        );
      }

      if (errorMsg) {
        ui?.showMessage("error", errorMsg, false);
      }
    }

    if (errorMsg) {
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.GrantPermission,
          returnUserError(
            new Error(errorMsg),
            SolutionSource,
            SolutionError.FailedToGrantPermission
          ),
          telemetryReporter
        )
      );
    }

    telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.GrantPermission, {
      [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
      [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
    });

    return ok({
      state: CollaborationState.OK,
      userInfo: userInfo,
      permissions,
    });
  } finally {
    await progressBar?.end(true);
  }
}

export async function grantPermission(
  param: CollabApiParam
): Promise<Result<PermissionsResult, FxError>> {
  if (param.apiVersion === 1) {
    const envState = param.ctx.envInfo.state;
    const envName = param.ctx.envInfo.envName;
    const telemetryReporter = param.ctx.telemetryReporter;
    const ui = param.ctx.ui;
    const graphTokenProvider = param.ctx.graphTokenProvider;
    const logProvider = param.ctx.logProvider;
    const platform = param.ctx.answers?.platform;
    const email = param.ctx.answers?.email;
    return grantPermissionImpl(
      param,
      envState,
      envName,
      telemetryReporter,
      ui,
      graphTokenProvider,
      logProvider,
      platform,
      email
    );
  } else {
    const configMap = ConfigMap.fromJSON(param.envInfo.state);
    if (!configMap) {
      return err(
        returnSystemError(
          new Error(`failed to convert profile ${JSON.stringify(param.envInfo.state)}`),
          PluginNames.SOLUTION,
          SolutionError.InternelError
        )
      );
    }
    const envState = flattenConfigMap(configMap);
    const envName = param.envInfo.envName;
    const telemetryReporter = param.ctx.telemetryReporter;
    const ui = param.ctx.userInteraction;
    const graphTokenProvider = param.tokenProvider.graphTokenProvider;
    const logProvider = param.ctx.logProvider;
    const platform = param.inputs?.platform;
    const email = param.inputs?.email;
    return grantPermissionImpl(
      param,
      envState,
      envName,
      telemetryReporter,
      ui,
      graphTokenProvider,
      logProvider,
      platform,
      email
    );
  }
}

// Execute plugins' grantPermission() using legacy API
async function executeGrantPermissionsV1(
  ctx: SolutionContext,
  userInfo: IUserList
): Promise<[ResourcePermission[], Err<any, FxError>[]]> {
  const plugins = getActivatedResourcePlugins(
    ctx.projectSettings?.solutionSettings as AzureSolutionSettings
  );
  const pluginsWithCtx: PluginsWithContext[] = getPluginAndContextArray(ctx, plugins);

  const grantPermissionWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(
    ([plugin, context]) => {
      return [
        plugin?.grantPermission
          ? (ctx: PluginContext) => plugin!.grantPermission!.bind(plugin)(ctx, userInfo)
          : undefined,
        context,
        plugin.name,
      ];
    }
  );

  const results = await executeConcurrently("", grantPermissionWithCtx);
  const permissions: ResourcePermission[] = [];
  const errors = [];
  for (const result of results) {
    if (result.isErr()) {
      errors.push(result);
      continue;
    }

    if (result && result.value) {
      for (const res of result.value) {
        permissions.push(res as ResourcePermission);
      }
    }
  }

  return [permissions, errors];
}

// Execute plugins' grantPermission() using v2 API
async function executeGrantPermissionsV2(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
  tokenProvider: TokenProvider,
  userInfo: IUserList
): Promise<[ResourcePermission[], Err<any, FxError>[]]> {
  const plugins = getActivatedV2ResourcePlugins(
    ctx.projectSetting?.solutionSettings as AzureSolutionSettings
  );

  const thunks: NamedThunk<Json>[] = plugins
    .filter((plugin) => !!plugin.grantPermission)
    .map((plugin) => {
      return {
        pluginName: `${plugin.name}`,
        taskName: "grantPermission",
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        thunk: () => plugin.grantPermission!(ctx, inputs, envInfo, tokenProvider, userInfo),
      };
    });

  const result = await executeNamedThunkConcurrently(thunks, ctx.logProvider);

  let permissions: ResourcePermission[];
  let errors: Err<any, FxError>[];
  if (result.kind === "success") {
    permissions = result.output.map((entry) => entry.result as ResourcePermission);
    errors = [];
  } else if (result.kind === "partialSuccess") {
    permissions = result.output.map((entry) => entry.result as ResourcePermission);
    errors = [err(result.error)];
  } else {
    permissions = [];
    errors = [err(result.error)];
  }

  return [permissions, errors];
}
