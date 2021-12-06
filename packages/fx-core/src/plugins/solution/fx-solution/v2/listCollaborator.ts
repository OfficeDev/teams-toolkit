import {
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
  Plugin,
  Err,
  TokenProvider,
  TelemetryReporter,
  UserInteraction,
  Json,
  LogProvider,
  Colors,
  ConfigMap,
} from "@microsoft/teamsfx-api";
import {
  AadOwner,
  CollaborationState,
  Collaborator,
  getHashedEnv,
  ListCollaboratorResult,
  TeamsAppAdmin,
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
import { ResourcePlugins, ResourcePluginsV2 } from "../ResourcePluginContainer";
import { NamedThunk, executeThunks } from "./executor";
import { CollabApiParam, CollaborationUtil } from "./collaborationUtil";
import { getPluginAndContextArray } from "./utils";
import { Container } from "typedi";
import { flattenConfigMap } from "../../../resource/utils4v2";
import { REMOTE_TEAMS_APP_TENANT_ID } from "..";

export async function executeListCollaboratorV2(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
  tokenProvider: TokenProvider,
  userInfo: IUserList
): Promise<[Result<any, FxError>[], Err<any, FxError>[]]> {
  const plugins: v2.ResourcePlugin[] = [
    Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin),
  ];

  if (CollaborationUtil.AadResourcePluginsActivated(ctx)) {
    plugins.push(Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AadPlugin));
  }

  const thunks: NamedThunk<Json>[] = plugins
    .filter((plugin) => !!plugin.listCollaborator)
    .map((plugin) => {
      return {
        pluginName: `${plugin.name}`,
        taskName: "listCollaborator",
        thunk: () =>
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          plugin.listCollaborator!(ctx, inputs, envInfo, tokenProvider, userInfo),
      };
    });

  const results = await executeThunks(thunks, ctx.logProvider);
  const errors: Err<any, FxError>[] = [];
  for (const r of results) {
    if (r.isErr()) {
      errors.push(r);
    }
  }
  return [results, errors];
}

export async function executeListCollaboratorV1(
  ctx: SolutionContext,
  userInfo: IUserList
): Promise<[Result<any, FxError>[], Err<any, FxError>[]]> {
  const plugins = [Container.get<Plugin>(ResourcePlugins.AppStudioPlugin)];

  if (CollaborationUtil.AadResourcePluginsActivated(ctx)) {
    plugins.push(Container.get<Plugin>(ResourcePlugins.AadPlugin));
  }

  const pluginsWithCtx: PluginsWithContext[] = getPluginAndContextArray(ctx, plugins);

  const listCollaboratorWithCtx: LifecyclesWithContext[] = pluginsWithCtx.map(
    ([plugin, context]) => {
      return [
        plugin?.listCollaborator
          ? (ctx: PluginContext) => plugin!.listCollaborator!.bind(plugin)(ctx, userInfo)
          : undefined,
        context,
        plugin.name,
      ];
    }
  );

  const results = await executeConcurrently("", listCollaboratorWithCtx);

  const errors: any = [];

  for (const result of results) {
    if (result.isErr()) {
      errors.push(result);
    }
  }
  return [results, errors];
}

async function listCollaboratorImpl(
  param: CollabApiParam,
  envState: Map<string, any>,
  envName?: string,
  telemetryReporter?: TelemetryReporter,
  ui?: UserInteraction,
  graphTokenProvider?: GraphTokenProvider,
  logProvider?: LogProvider,
  platform?: string
): Promise<Result<ListCollaboratorResult, FxError>> {
  telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.ListCollaboratorStart, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
  });

  const result = await CollaborationUtil.getCurrentUserInfo(graphTokenProvider);
  if (result.isErr()) {
    return err(
      sendErrorTelemetryThenReturnError(
        SolutionTelemetryEvent.ListCollaborator,
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

  const userInfo = result.value as IUserList;

  if (!envName) {
    return err(
      sendErrorTelemetryThenReturnError(
        SolutionTelemetryEvent.ListCollaborator,
        returnSystemError(
          new Error("Failed to get env name."),
          SolutionSource,
          SolutionError.FailedToGetEnvName
        ),
        telemetryReporter
      )
    );
  }

  const [results, errors] =
    param.apiVersion === 1
      ? await executeListCollaboratorV1(param.ctx, userInfo)
      : await executeListCollaboratorV2(
          param.ctx,
          param.inputs,
          param.envInfo,
          param.tokenProvider,
          userInfo
        );

  let errorMsg = "";
  if (errors.length > 0) {
    errorMsg += `Failed to list collaborator for the project.\n Error details: \n`;
    for (const fxError of errors) {
      errorMsg += fxError.error.message + "\n";
    }
  }

  if (errorMsg) {
    return err(
      sendErrorTelemetryThenReturnError(
        SolutionTelemetryEvent.ListCollaborator,
        returnUserError(
          new Error(errorMsg),
          SolutionSource,
          SolutionError.FailedToListCollaborator
        ),
        telemetryReporter
      )
    );
  }

  const isAadActivated = CollaborationUtil.AadResourcePluginsActivated(param.ctx);
  const teamsAppOwners: TeamsAppAdmin[] = results[0].isErr() ? [] : results[0].value;
  const aadOwners: AadOwner[] =
    (results[1] && results[1].isErr()) || !results[1] ? [] : results[1].value;
  const collaborators: Collaborator[] = [];
  const teamsAppId: string = teamsAppOwners[0]?.resourceId ?? "";
  const aadAppId: string = aadOwners[0]?.resourceId ?? "";
  const aadAppTenantId = envState.get(PluginNames.SOLUTION)?.get(REMOTE_TEAMS_APP_TENANT_ID);

  for (const teamsAppOwner of teamsAppOwners) {
    const aadOwner = aadOwners.find((owner) => owner.userObjectId === teamsAppOwner.userObjectId);

    collaborators.push({
      // For guest account, aadOwner.userPrincipalName will be user's email, and is easy to read.
      userPrincipalName:
        aadOwner?.userPrincipalName ??
        teamsAppOwner.userPrincipalName ??
        teamsAppOwner.userObjectId,
      userObjectId: teamsAppOwner.userObjectId,
      isAadOwner: aadOwner ? true : false,
      aadResourceId: aadOwner ? aadOwner.resourceId : undefined,
      teamsAppResourceId: teamsAppOwner.resourceId,
    });
  }

  if (platform === Platform.CLI || platform === Platform.VSCode) {
    const message = [
      { content: `Listing M365 permissions\n`, color: Colors.BRIGHT_WHITE },
      { content: `Account used to check: `, color: Colors.BRIGHT_WHITE },
      { content: userInfo.userPrincipalName + "\n", color: Colors.BRIGHT_MAGENTA },
      {
        content: `Starting list all teams app owners for environment: `,
        color: Colors.BRIGHT_WHITE,
      },
      { content: `${envName}\n`, color: Colors.BRIGHT_MAGENTA },
      { content: `Tenant ID: `, color: Colors.BRIGHT_WHITE },
      { content: aadAppTenantId + "\n", color: Colors.BRIGHT_MAGENTA },
      { content: `M365 Teams App (ID: `, color: Colors.BRIGHT_WHITE },
      { content: teamsAppId, color: Colors.BRIGHT_MAGENTA },
    ];

    if (isAadActivated) {
      message.push(
        { content: `), SSO AAD App (ID: `, color: Colors.BRIGHT_WHITE },
        { content: aadAppId, color: Colors.BRIGHT_MAGENTA },
        { content: `)\n`, color: Colors.BRIGHT_WHITE }
      );
    } else {
      message.push({ content: ")\n", color: Colors.BRIGHT_WHITE });
    }

    for (const collaborator of collaborators) {
      message.push(
        { content: `Teams App Owner: `, color: Colors.BRIGHT_WHITE },
        { content: collaborator.userPrincipalName, color: Colors.BRIGHT_MAGENTA },
        { content: `. `, color: Colors.BRIGHT_WHITE }
      );

      if (isAadActivated && !collaborator.isAadOwner) {
        message.push({ content: `(Not owner of SSO AAD app)`, color: Colors.BRIGHT_YELLOW });
      }

      message.push({ content: "\n", color: Colors.BRIGHT_WHITE });
    }

    if (platform === Platform.CLI) {
      ui?.showMessage("info", message, false);
    } else if (platform === Platform.VSCode) {
      logProvider?.info(message);
    }
  }

  const aadOwnerCount = collaborators.filter(
    (collaborator) => collaborator.aadResourceId && collaborator.isAadOwner
  ).length;
  telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.ListCollaborator, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
    [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
    [SolutionTelemetryProperty.CollaboratorCount]: collaborators.length.toString(),
    [SolutionTelemetryProperty.AadOwnerCount]: aadOwnerCount.toString(),
    [SolutionTelemetryProperty.Env]: getHashedEnv(envName),
  });

  return ok({
    collaborators: collaborators,
    state: CollaborationState.OK,
  });
}

export async function listCollaborator(
  param: CollabApiParam
): Promise<Result<ListCollaboratorResult, FxError>> {
  if (param.apiVersion === 1) {
    const envState = param.ctx.envInfo.state;
    const envName = param.ctx.envInfo.envName;
    const telemetryReporter = param.ctx.telemetryReporter;
    const ui = param.ctx.ui;
    const graphTokenProvider = param.ctx.graphTokenProvider;
    const logProvider = param.ctx.logProvider;
    const platform = param.ctx.answers?.platform;
    return listCollaboratorImpl(
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
    return listCollaboratorImpl(
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
