// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios, { AxiosError } from "axios";
import { TeamsFxConfiguration } from "../models/teamsfxConfiguration";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "./errors";
import { internalLogger } from "../util/logger";
import { formatString } from "../util/utils";

/**
 * Call backend API with authentication of Teams.
 *
 * @param {TeamsFx} teamsfx - Used to provide configuration and auth
 * @param {string?} name - The API name
 * @param {any} param - Parameters object to be passed to API
 * @param method - HTTP method, get or post
 * @returns HTTP response from backend API
 *
 * @throws {@link ErrorCode|InvalidConfiguration} when API config is invalid.
 * @throws {@link ErrorCode|InternalError} when get user access token failed or access token is invalid.
 * @throws {@link ErrorCode|FailedOperation} when failed to call backend API.
 *
 * @beta
 */
export async function callApi(
  teamsfx: TeamsFxConfiguration,
  name?: string,
  param?: any,
  method?: "get" | "post"
): Promise<any> {
  const apiName = name ?? teamsfx.getConfig("apiName");
  const apiEndpoint = teamsfx.getConfig("apiEndpoint");
  const httpMethod = method ?? "get";
  if (!apiName || !apiEndpoint) {
    internalLogger.error(ErrorMessage.InvalidApiConfiguration);
    throw new ErrorWithCode(ErrorMessage.InvalidApiConfiguration, ErrorCode.InvalidConfiguration);
  }
  internalLogger.info(`call api ${apiName} using HTTP ${httpMethod} with param ${param}`);

  const accessToken = await teamsfx.getCredential().getToken("");
  if (accessToken === null) {
    const errorMsg = "Access token is null";
    internalLogger.error(errorMsg);
    throw new ErrorWithCode(
      formatString(ErrorMessage.FailToAcquireTokenOnBehalfOfUser, errorMsg),
      ErrorCode.InternalError
    );
  }
  try {
    let response: any;
    if (httpMethod === "get") {
      response = await axios.get(apiEndpoint + "/api/" + apiName, {
        headers: {
          authorization: "Bearer " + accessToken.token,
        },
      });
    } else {
      response = await axios.post(apiEndpoint + "/api/" + apiName, param, {
        headers: {
          authorization: "Bearer " + accessToken.token,
        },
      });
    }
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    let funcErrorMsg = "";
    if (err?.response?.status === 404) {
      funcErrorMsg = `There may be a problem with the deployment of Azure Function App, please deploy Azure Function (Run command palette "Teams: Deploy to the cloud") first before running this App`;
    } else if (err?.message === "Network Error") {
      funcErrorMsg =
        "Cannot call Azure Function due to network error, please check your network connection status and ";
      const url = err?.config?.url;
      if (url && url.indexOf("localhost") >= 0) {
        funcErrorMsg += `make sure to start Azure Function locally (Run "npm run start" command inside api folder from terminal) first before running this App`;
      } else {
        funcErrorMsg += `make sure to provision and deploy Azure Function (Run command palette "Teams: Provision in the cloud" and "Teams: Deploy to the cloud") first before running this App`;
      }
    } else {
      funcErrorMsg = err.message;
      if (err.response?.data?.error) {
        funcErrorMsg += ": " + err.response.data.error;
      }
    }
    internalLogger.error(funcErrorMsg);
    throw new ErrorWithCode(funcErrorMsg, ErrorCode.FailedOperation);
  }
}
