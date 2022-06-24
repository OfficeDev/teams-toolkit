import {
  AzureSolutionSettings,
  Colors,
  err,
  FxError,
  M365TokenProvider,
  ok,
  Platform,
  PluginContext,
  Result,
  SolutionContext,
  v2,
  Err,
  TokenProvider,
  TelemetryReporter,
  UserInteraction,
  LogProvider,
  ConfigMap,
  Json,
  SystemError,
  UserError,
} from "@microsoft/teamsfx-api";
import { CollaborationState, PermissionsResult, ResourcePermission } from "../../../../common";
import { AppUser } from "../../../resource/appstudio/interfaces/appUser";
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
import { sendErrorTelemetryThenReturnError } from "../utils/util";
import { executeConcurrently, LifecyclesWithContext } from "../executor";
import { getActivatedResourcePlugins, ResourcePluginsV2 } from "../ResourcePluginContainer";
import { flattenConfigMap } from "../../../resource/utils4v2";
import { NamedThunk, executeConcurrently as executeNamedThunkConcurrently } from "./executor";
import { CollabApiParam, CollaborationUtil } from "./collaborationUtil";
import { getPluginAndContextArray } from "./utils";
import { Container } from "typedi";
import { PluginsWithContext } from "../types";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

async function executeCheckPermissionV1(
  ctx: SolutionContext,
  userInfo: AppUser
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
  userInfo: AppUser
): Promise<[ResourcePermission[], Err<any, FxError>[]]> {
  const plugins: v2.ResourcePlugin[] = [
    Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin),
  ];

  if (CollaborationUtil.AadResourcePluginsActivated(ctx)) {
    plugins.push(Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AadPlugin));
  }

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
  m365TokenProvider?: M365TokenProvider,
  logProvider?: LogProvider,
  platform?: string
): Promise<Result<PermissionsResult, FxError>> {
  telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.CheckPermissionStart, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
  });

  const result = await CollaborationUtil.getCurrentUserInfo(m365TokenProvider);
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

  const userInfo = result.value as AppUser;

  if (platform === Platform.CLI) {
    const aadAppTenantId = envState.get(PluginNames.SOLUTION)?.get(REMOTE_TEAMS_APP_TENANT_ID);
    if (!envName) {
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.CheckPermission,
          new SystemError(
            SolutionSource,
            SolutionError.FailedToGetEnvName,
            getDefaultString("core.collaboration.FailedToGetEnvName"),
            getLocalizedString("core.collaboration.FailedToGetEnvName")
          ),
          telemetryReporter
        )
      );
    }

    const message = [
      {
        content: getLocalizedString("core.collaboration.AccountUsedToCheck"),
        color: Colors.BRIGHT_WHITE,
      },
      { content: userInfo.userPrincipalName + "\n", color: Colors.BRIGHT_MAGENTA },
      {
        content: getLocalizedString("core.collaboration.StaringCheckPermission"),
        color: Colors.BRIGHT_WHITE,
      },
      { content: `${envName}\n`, color: Colors.BRIGHT_MAGENTA },
      { content: getLocalizedString("core.collaboration.TenantId"), color: Colors.BRIGHT_WHITE },
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
    errorMsg += getLocalizedString("core.collaboration.FailedToCheckPermission");
    for (const fxError of errors) {
      errorMsg += fxError.error.message + "\n";
    }
  }

  if (platform === Platform.CLI) {
    for (const permission of permissions) {
      const message = [
        {
          content: getLocalizedString("core.collaboration.CheckPermissionResourceId"),
          color: Colors.BRIGHT_WHITE,
        },
        {
          content: permission.resourceId ?? getLocalizedString("core.collaboration.Undefined"),
          color: Colors.BRIGHT_MAGENTA,
        },
        {
          content: getLocalizedString("core.collaboration.ResourceName"),
          color: Colors.BRIGHT_WHITE,
        },
        { content: permission.name, color: Colors.BRIGHT_MAGENTA },
        {
          content: getLocalizedString("core.collaboration.Permission"),
          color: Colors.BRIGHT_WHITE,
        },
        {
          content: permission.roles
            ? permission.roles.toString()
            : getLocalizedString("core.collaboration.Undefined") + "\n",
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
        new UserError(SolutionSource, SolutionError.FailedToCheckPermission, errorMsg),
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
      : getLocalizedString("core.collaboration.Undefined"),
    [SolutionTelemetryProperty.TeamsAppPermission]: teamsAppPermission?.roles
      ? teamsAppPermission.roles.join(";")
      : getLocalizedString("core.collaboration.Undefined"),
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
    const m365TokenProvider = param.ctx.m365TokenProvider;
    const logProvider = param.ctx.logProvider;
    const platform = param.ctx.answers?.platform;
    return checkPermissionImpl(
      param,
      envState,
      envName,
      telemetryReporter,
      ui,
      m365TokenProvider,
      logProvider,
      platform
    );
  } else {
    const configMap = ConfigMap.fromJSON(param.envInfo.state);
    if (!configMap) {
      return err(
        new SystemError(
          PluginNames.SOLUTION,
          SolutionError.InternelError,
          getDefaultString("core.collaboration.FailedToConvertProfile") +
            JSON.stringify(param.envInfo.state),
          getLocalizedString("core.collaboration.FailedToConvertProfile") +
            JSON.stringify(param.envInfo.state)
        )
      );
    }
    const envState = flattenConfigMap(configMap);
    const envName = param.envInfo.envName;
    const telemetryReporter = param.ctx.telemetryReporter;
    const ui = param.ctx.userInteraction;
    const m365TokenProvider = param.tokenProvider.m365TokenProvider;
    const logProvider = param.ctx.logProvider;
    const platform = param.inputs?.platform;
    return checkPermissionImpl(
      param,
      envState,
      envName,
      telemetryReporter,
      ui,
      m365TokenProvider,
      logProvider,
      platform
    );
  }
}
