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
  getStrings,
  PermissionsResult,
  ResourcePermission,
} from "../../../../common";
import { IUserList } from "../../../resource/appstudio/interfaces/IAppDefinition";
import {
  PluginNames,
  REMOTE_TEAMS_APP_TENANT_ID,
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
import { CollabApiParam, CollaborationUtil } from "./collaborationUtil";
import { getPluginAndContextArray } from "./utils";

async function executeCheckPermissionV1(
  ctx: SolutionContext,
  userInfo: IUserList
): Promise<[ResourcePermission[], Err<any, FxError>[]]> {
  const plugins = getActivatedResourcePlugins(
    ctx.projectSettings?.solutionSettings as AzureSolutionSettings
  );
  const pluginsWithCtx: PluginsWithContext[] = getPluginAndContextArray(ctx, plugins);

  const checkPermissionWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(
    ([plugin, context]) => {
      return [
        plugin?.checkPermission
          ? (ctx: PluginContext) => plugin!.checkPermission!.bind(plugin)(ctx, userInfo)
          : undefined,
        context,
        plugin.name,
      ];
    }
  );

  const results = await executeConcurrently("", checkPermissionWithCtx);
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

async function executeCheckPermissionV2(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
  tokenProvider: TokenProvider,
  userInfo: IUserList
): Promise<[ResourcePermission[], Err<any, FxError>[]]> {
  const plugins = getActivatedV2ResourcePlugins(ctx.projectSetting);

  const thunks: NamedThunk<Json>[] = plugins
    .filter((plugin) => !!plugin.checkPermission)
    .map((plugin) => {
      return {
        pluginName: `${plugin.name}`,
        taskName: "checkPermission",
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        thunk: () => plugin.checkPermission!(ctx, inputs, envInfo, tokenProvider, userInfo),
      };
    });

  const results = await executeNamedThunkConcurrently(thunks, ctx.logProvider);

  return CollaborationUtil.collectPermissionsAndErrors(results);
}

async function checkPermissionImpl(
  param: CollabApiParam,
  envState: Map<string, any>,
  envName?: string,
  telemetryReporter?: TelemetryReporter,
  ui?: UserInteraction,
  graphTokenProvider?: GraphTokenProvider,
  logProvider?: LogProvider,
  platform?: string
): Promise<Result<PermissionsResult, FxError>> {
  telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.CheckPermissionStart, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
  });

  const result = await CollaborationUtil.getCurrentUserInfo(graphTokenProvider);
  if (result.isErr()) {
    return err(
      sendErrorTelemetryThenReturnError(
        SolutionTelemetryEvent.CheckPermission,
        result.error,
        telemetryReporter
      )
    );
  }

  const stateResult = CollaborationUtil.getCurrentCollaborationState(envState, result.value);

  if (stateResult.state != CollaborationState.OK) {
    if (platform === Platform.CLI) {
      ui?.showMessage("warn", stateResult.message!, false);
    }
    return ok({
      state: stateResult.state,
      message: stateResult.message,
    });
  }

  const userInfo = result.value as IUserList;

  if (platform === Platform.CLI) {
    const aadAppTenantId = envState.get(PluginNames.SOLUTION)?.get(REMOTE_TEAMS_APP_TENANT_ID);
    if (!envName) {
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.CheckPermission,
          returnSystemError(
            new Error(getStrings().solution.Collaboration.FailedToGetEnvName),
            SolutionSource,
            SolutionError.FailedToGetEnvName
          ),
          telemetryReporter
        )
      );
    }

    const message = [
      {
        content: getStrings().solution.Collaboration.AccountUsedToCheck,
        color: Colors.BRIGHT_WHITE,
      },
      { content: userInfo.userPrincipalName + "\n", color: Colors.BRIGHT_MAGENTA },
      {
        content: getStrings().solution.Collaboration.StaringCheckPermission,
        color: Colors.BRIGHT_WHITE,
      },
      { content: `${envName}\n`, color: Colors.BRIGHT_MAGENTA },
      { content: getStrings().solution.Collaboration.TenantId, color: Colors.BRIGHT_WHITE },
      { content: aadAppTenantId + "\n", color: Colors.BRIGHT_MAGENTA },
    ];

    ui?.showMessage("info", message, false);
  }
  const [permissions, errors] =
    param.apiVersion === 1
      ? await executeCheckPermissionV1(param.ctx, userInfo)
      : await executeCheckPermissionV2(
          param.ctx,
          param.inputs,
          param.envInfo,
          param.tokenProvider,
          userInfo
        );

  let errorMsg = "";
  if (errors.length > 0) {
    errorMsg += getStrings().solution.Collaboration.FailedToCheckPermission;
    for (const fxError of errors) {
      errorMsg += fxError.error.message + "\n";
    }
  }

  if (platform === Platform.CLI) {
    for (const permission of permissions) {
      const message = [
        {
          content: getStrings().solution.Collaboration.CheckPermissionResourceId,
          color: Colors.BRIGHT_WHITE,
        },
        {
          content: permission.resourceId ?? getStrings().solution.Collaboration.Undefined,
          color: Colors.BRIGHT_MAGENTA,
        },
        { content: getStrings().solution.Collaboration.ResourceName, color: Colors.BRIGHT_WHITE },
        { content: permission.name, color: Colors.BRIGHT_MAGENTA },
        { content: getStrings().solution.Collaboration.Permission, color: Colors.BRIGHT_WHITE },
        {
          content: permission.roles
            ? permission.roles.toString()
            : getStrings().solution.Collaboration.Undefined + "\n",
          color: Colors.BRIGHT_MAGENTA,
        },
      ];

      ui?.showMessage("info", message, false);
    }
  }

  if (errorMsg) {
    return err(
      sendErrorTelemetryThenReturnError(
        SolutionTelemetryEvent.CheckPermission,
        returnUserError(new Error(errorMsg), SolutionSource, SolutionError.FailedToCheckPermission),
        telemetryReporter
      )
    );
  }

  const aadPermission = permissions.find((permission) => permission.name === "Azure AD App");
  const teamsAppPermission = permissions.find((permission) => permission.name === "Teams App");

  telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.CheckPermission, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
    [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
    [SolutionTelemetryProperty.AadPermission]: aadPermission?.roles
      ? aadPermission.roles.join(";")
      : getStrings().solution.Collaboration.Undefined,
    [SolutionTelemetryProperty.TeamsAppPermission]: teamsAppPermission?.roles
      ? teamsAppPermission.roles.join(";")
      : getStrings().solution.Collaboration.Undefined,
  });

  return ok({
    state: CollaborationState.OK,
    permissions,
  });
}

export async function checkPermission(
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
    return checkPermissionImpl(
      param,
      envState,
      envName,
      telemetryReporter,
      ui,
      graphTokenProvider,
      logProvider,
      platform
    );
  } else {
    const configMap = ConfigMap.fromJSON(param.envInfo.state);
    if (!configMap) {
      return err(
        returnSystemError(
          new Error(
            getStrings().solution.Collaboration.FailedToConvertProfile +
              JSON.stringify(param.envInfo.state)
          ),
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
    return checkPermissionImpl(
      param,
      envState,
      envName,
      telemetryReporter,
      ui,
      graphTokenProvider,
      logProvider,
      platform
    );
  }
}
