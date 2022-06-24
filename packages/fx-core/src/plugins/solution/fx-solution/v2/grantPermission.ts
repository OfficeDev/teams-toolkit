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
  UserError,
  SystemError,
} from "@microsoft/teamsfx-api";
import { CollaborationState, PermissionsResult, ResourcePermission } from "../../../../common";
import { AppUser } from "../../../resource/appstudio/interfaces/appUser";
import {
  AzureRoleAssignmentsHelpLink,
  PluginNames,
  SharePointManageSiteAdminHelpLink,
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
import { CollaborationUtil, CollabApiParam } from "./collaborationUtil";
import { getPluginAndContextArray } from "./utils";
import { REMOTE_TEAMS_APP_TENANT_ID } from "..";
import { Container } from "typedi";
import { PluginsWithContext } from "../types";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

async function grantPermissionImpl(
  param: CollabApiParam,
  envState: Map<string, any>,
  envName?: string,
  telemetryReporter?: TelemetryReporter,
  ui?: UserInteraction,
  m365TokenProvider?: M365TokenProvider,
  logProvider?: LogProvider,
  platform?: string,
  email?: string
): Promise<Result<PermissionsResult, FxError>> {
  telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.GrantPermissionStart, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
  });

  const progressBar = ui?.createProgressBar(
    getLocalizedString("core.collaboration.GrantingPermission"),
    1
  );
  try {
    const result = await CollaborationUtil.getCurrentUserInfo(m365TokenProvider);
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
          new UserError(
            SolutionSource,
            SolutionError.EmailCannotBeEmptyOrSame,
            getDefaultString("core.collaboration.EmailCannotBeEmptyOrSame"),
            getLocalizedString("core.collaboration.EmailCannotBeEmptyOrSame")
          ),
          telemetryReporter
        )
      );
    }

    const userInfo = await CollaborationUtil.getUserInfo(m365TokenProvider, email);

    if (!userInfo) {
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.GrantPermission,
          new UserError(
            SolutionSource,
            SolutionError.CannotFindUserInCurrentTenant,
            getDefaultString("core.collaboration.CannotFindUserInCurrentTenant"),
            getLocalizedString("core.collaboration.CannotFindUserInCurrentTenant")
          ),
          telemetryReporter
        )
      );
    }

    progressBar?.start();
    progressBar?.next(getLocalizedString("core.collaboration.GrantPermissionForUser", email));

    if (platform === Platform.CLI) {
      const aadAppTenantId = envState.get(PluginNames.SOLUTION)?.get(REMOTE_TEAMS_APP_TENANT_ID);
      if (!envName) {
        return err(
          sendErrorTelemetryThenReturnError(
            SolutionTelemetryEvent.GrantPermission,
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
          content: getLocalizedString("core.collaboration.AccountToGrantPermission"),
          color: Colors.BRIGHT_WHITE,
        },
        { content: userInfo.userPrincipalName + "\n", color: Colors.BRIGHT_MAGENTA },
        {
          content: getLocalizedString("core.collaboration.StartingGrantPermission"),
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
      errorMsg += getLocalizedString("core.collaboration.FailedToGrantPermission", email);
      for (const fxError of errors) {
        errorMsg += fxError.error.message + "\n";
      }
    }

    if (platform === Platform.CLI) {
      for (const permission of permissions) {
        const message = [
          { content: `${permission.roles?.join(",")} `, color: Colors.BRIGHT_MAGENTA },
          {
            content: getLocalizedString("core.collaboration.PermissionHasBeenGrantTo"),
            color: Colors.BRIGHT_WHITE,
          },
          { content: permission.name, color: Colors.BRIGHT_MAGENTA },
          {
            content: getLocalizedString("core.collaboration.GrantPermissionResourceId"),
            color: Colors.BRIGHT_WHITE,
          },
          { content: `${permission.resourceId}`, color: Colors.BRIGHT_MAGENTA },
        ];

        ui?.showMessage("info", message, false);
      }

      if (CollaborationUtil.isSpfxProject(param.ctx)) {
        ui?.showMessage(
          "info",
          getLocalizedString("core.collaboration.SharePointTip") +
            SharePointManageSiteAdminHelpLink,
          false
        );
      } else {
        ui?.showMessage(
          "info",
          getLocalizedString("core.collaboration.AzureTip") + AzureRoleAssignmentsHelpLink,
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
          new UserError(SolutionSource, SolutionError.FailedToGrantPermission, errorMsg),
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
    const m365TokenProvider = param.ctx.m365TokenProvider;
    const logProvider = param.ctx.logProvider;
    const platform = param.ctx.answers?.platform;
    const email = param.ctx.answers?.email;
    return grantPermissionImpl(
      param,
      envState,
      envName,
      telemetryReporter,
      ui,
      m365TokenProvider,
      logProvider,
      platform,
      email
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
    const email = param.inputs?.email;
    return grantPermissionImpl(
      param,
      envState,
      envName,
      telemetryReporter,
      ui,
      m365TokenProvider,
      logProvider,
      platform,
      email
    );
  }
}

// Execute plugins' grantPermission() using legacy API
async function executeGrantPermissionsV1(
  ctx: SolutionContext,
  userInfo: AppUser
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
  userInfo: AppUser
): Promise<[ResourcePermission[], Err<any, FxError>[]]> {
  const plugins: v2.ResourcePlugin[] = [
    Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin),
  ];

  if (CollaborationUtil.AadResourcePluginsActivated(ctx)) {
    plugins.push(Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AadPlugin));
  }
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

  const results = await executeNamedThunkConcurrently(thunks, ctx.logProvider);

  return CollaborationUtil.collectPermissionsAndErrors(results);
}
