// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import axios, { AxiosInstance, CreateAxiosDefaults } from "axios";
import { TelemetryReporter } from "@microsoft/teamsfx-api";
import { APP_STUDIO_API_NAMES } from "../component/driver/teamsApp/constants";
import {
  TelemetryPropertyKey,
  TelemetryPropertyValue,
} from "../component/driver/teamsApp/utils/telemetry";
import { TelemetryEvent } from "./telemetry";
import { DeveloperPortalAPIFailedError } from "../error/teamsApp";
import { Constants } from "../component/driver/teamsApp/constants";

/**
 * This client will send telemetries to record API request trace
 */
export class WrappedAxiosClient {
  public static create(
    telemetryReporter: TelemetryReporter,
    config?: CreateAxiosDefaults
  ): AxiosInstance {
    const instance = axios.create(config);

    // Send API start telemetry
    instance.interceptors.request.use((request) => {
      const baseUrl = request.baseURL!;
      const method = request.method!;
      const path = request.url!;
      const apiName = this.convertUrlToApiName(baseUrl, path, method);

      const properties: { [key: string]: string } = {
        url: `<${apiName}-url>`,
        method: method,
      };

      let eventName: string;
      if (this.isTDPApi(baseUrl)) {
        properties[TelemetryPropertyKey.region] = String(this.extractRegion(baseUrl, path));
        eventName = TelemetryEvent.AppStudioApi;
      } else {
        eventName = TelemetryEvent.DependencyApi;
      }

      telemetryReporter.sendTelemetryEvent(`${eventName}-start`, properties);

      return request;
    });

    instance.interceptors.response.use(
      // Send API success telemetry
      (response) => {
        const baseUrl = response.request.host;
        const method = response.request.method;
        const path = response.request.path;
        const apiName = this.convertUrlToApiName(baseUrl, response.request.path, method);

        const properties: { [key: string]: string } = {
          url: `<${apiName}-url>`,
          method: method,
          [TelemetryPropertyKey.success]: TelemetryPropertyValue.success,
          "status-code": response.status.toString(),
        };

        let eventName: string;
        if (this.isTDPApi(baseUrl)) {
          // TDP API with region property
          properties[TelemetryPropertyKey.region] = String(this.extractRegion(baseUrl, path));
          eventName = TelemetryEvent.AppStudioApi;
        } else {
          eventName = TelemetryEvent.DependencyApi;
        }
        telemetryReporter.sendTelemetryErrorEvent(eventName, properties);
        return response;
      },
      // Send API failure telemetry
      (error) => {
        const baseUrl = error.response.request.host;
        const path = error.response.request.path;
        const method = error.response.request.method;
        const apiName = this.convertUrlToApiName(baseUrl, path, method);

        const properties: { [key: string]: string } = {
          url: `<${apiName}-url>`,
          method: method,
          [TelemetryPropertyKey.success]: TelemetryPropertyValue.failure,
          "status-code": error.response.status.toString(),
        };

        let eventName: string;
        if (this.isTDPApi(baseUrl)) {
          properties[TelemetryPropertyKey.region] = String(this.extractRegion(baseUrl, path));
          const correlationId = error.response.headers[Constants.CORRELATION_ID];
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          const extraData = error.response.data
            ? `data: ${JSON.stringify(error.response.data)}`
            : "";
          const TDPApiFailedError = new DeveloperPortalAPIFailedError(
            error,
            correlationId,
            apiName,
            extraData
          );
          properties[
            TelemetryPropertyKey.errorCode
          ] = `${TDPApiFailedError.source}.${TDPApiFailedError.name}`;
          properties[TelemetryPropertyKey.errorMessage] = TDPApiFailedError.message;
          eventName = TelemetryEvent.AppStudioApi;
        } else {
          eventName = TelemetryEvent.DependencyApi;
        }

        telemetryReporter.sendTelemetryErrorEvent(eventName, properties);
        return error;
      }
    );

    return instance;
  }

  /**
   * Convert request URL to API name, otherwise it will be redacted in telemetry
   * @param baseUrl
   * @param path
   * @param method
   * @returns
   */
  private static convertUrlToApiName(baseUrl: string, path: string, method: string): string {
    if (this.isTDPApi(baseUrl)) {
      if (path.match(new RegExp("/api/appdefinitions/partnerCenterAppPackageValidation"))) {
        return APP_STUDIO_API_NAMES.VALIDATE_APP_PACKAGE;
      }
      if (path.match(new RegExp("/api/appdefinitions/v2/import"))) {
        return APP_STUDIO_API_NAMES.CREATE_APP;
      }
      if (path.match(new RegExp("/api/appdefinitions/manifest"))) {
        return APP_STUDIO_API_NAMES.EXISTS_IN_TENANTS;
      }
      if (path.match(new RegExp("/api/appdefinitions/.*/manifest"))) {
        return APP_STUDIO_API_NAMES.GET_APP_PACKAGE;
      }
      if (path.match(new RegExp("/api/appdefinitions/.*/owner"))) {
        return APP_STUDIO_API_NAMES.UPDATE_OWNER;
      }
      if (path.match(new RegExp("/api/appdefinitions/.*"))) {
        return APP_STUDIO_API_NAMES.GET_APP;
      }
    }
    return baseUrl + path;
  }

  /**
   * Extract region from baseUrl, E.g. https://dev.teams.microsoft.com/amer => amer
   * @param url
   * @returns
   */
  private static extractRegion(url: string, path: string): string | undefined {
    const fullPath = url + path;
    const regex = /dev(-int)?\.teams\.microsoft\.com\/([a-zA-Z-_]+)/;
    const matches = regex.exec(fullPath);
    if (matches != null && matches.length > 1) {
      return matches[2];
    }

    return undefined;
  }

  /**
   * Check if it's TDP Api
   * @param baseUrl
   * @returns
   */
  private static isTDPApi(baseUrl: string): boolean {
    const regex = /dev(-int)?\.teams\.microsoft\.com/;
    if (baseUrl.match(regex)) {
      return true;
    }
    return false;
  }
}
