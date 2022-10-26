// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
}

export class TelemetryConstant {
  // the component name of the deployment life cycle
  public static readonly DEPLOY_COMPONENT_NAME = "deploy";
  // the component name of the provision life cycle
  public static readonly PROVISION_COMPONENT_NAME = "provision";
}
