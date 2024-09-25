// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Siglud <Siglud@gmail.com>
 */
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOTFOUND = 404,
  TOOMANYREQS = 429,
  INTERNAL_SERVER_ERROR = 500,
}

export class HttpMethod {
  public static readonly POST = "POST";
  public static readonly GET = "GET";
  public static readonly DELETE = "DELETE";
  public static readonly PATCH = "PATCH";
}

export class TelemetryConstant {
  // the component name of the deployment life cycle
  public static readonly DEPLOY_COMPONENT_NAME = "deploy";
  // the component name of the provision life cycle
  public static readonly PROVISION_COMPONENT_NAME = "provision";
  // the script component name
  public static readonly SCRIPT_COMPONENT = "script";
  // the component name of the deployment to SWA script
  public static readonly DEPLOY_TO_SWA_COMPONENT = "deploy_to_swa";
}
