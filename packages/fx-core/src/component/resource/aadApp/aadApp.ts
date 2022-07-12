// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  CloudResource,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { ComponentNames } from "../../constants";
import { GetActionConfigure } from "./actions/configure";
import { GetActionGenerateAuthFiles } from "./actions/generateAuthFiles";
import { GetActionGenerateBicep } from "./actions/generateBicep";
import { GetActionGenerateManifest } from "./actions/generateManifest";
import { GetActionProvision } from "./actions/provision";
import { GetActionSetApplication } from "./actions/setApplication";

@Service(ComponentNames.AadApp)
export class AadApp implements CloudResource {
  readonly type = "cloud";
  readonly name = ComponentNames.AadApp;
  outputs = {
    applicationIdUri: {
      key: "applicationIdUri",
    },
    clientId: {
      key: "clientId",
    },
    clientSecret: {
      key: "clientSecret",
    },
    objectId: {
      key: "objectId",
    },
    oauth2PermissionScopeId: {
      key: "oauth2PermissionScopeId",
    },
    frontendEndpoint: {
      key: "frontendEndpoint",
    },
    botId: {
      key: "botId",
    },
    botEndpoint: {
      key: "botEndpoint",
    },
    domain: {
      key: "domain",
    },
    endpoint: {
      key: "endpoint",
    },
    oauthAuthority: {
      key: "oauthAuthority",
    },
    oauthHost: {
      key: "oauthHost",
    },
    tenantId: {
      key: "tenantId",
    },
  };
  finalOutputKeys = [
    "applicationIdUris",
    "clientId",
    "clientSecret",
    "objectId",
    "oauth2PermissionScopeId",
    "frontendEndpoint",
    "botId",
    "botEndpoint",
    "domain",
    "endpoint",
    "oauthAuthority",
    "oauthHost",
    "tenantId",
  ];
  secretFields = ["clientSecret"];
  generateManifest(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    return ok(GetActionGenerateManifest());
  }
  generateAuthFiles(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    return ok(GetActionGenerateAuthFiles());
  }
  generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    return ok(GetActionGenerateBicep());
  }
  provision(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    return ok(GetActionProvision());
  }
  configure(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    return ok(GetActionConfigure());
  }
  setApplicationInContext(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    return ok(GetActionSetApplication());
  }
}
