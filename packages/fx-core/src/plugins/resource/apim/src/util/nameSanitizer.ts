// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import md5 from "md5";

// TODO: Validate all the service name after user input and config file loading.
export class NameSanitizer {
    // TODO: limit max length of the name
    public static sanitizeApimName(appName: string, suffix: string): string {
        return `${appName}am${suffix}`;
    }

    public static sanitizeProductId(appName: string, suffix: string): string {
        return `${appName}-product-${suffix}`;
    }

    public static sanitizeOAuthServerId(appName: string, suffix: string): string {
        return `${appName}-server-${suffix}`;
    }

    public static sanitizeAadDisplayName(appName: string): string {
        return `${appName}-client`;
    }

    public static sanitizeAadSecretDisplayName(appName: string): string {
        return `${appName}`;
    }

    public static sanitizeApiNamePrefix(apiTitle: string): string {
        return apiTitle.toLowerCase().replace(/[^0-9a-z]+/g, "-");
    }

    public static sanitizeApiVersionIdentity(apiVersion: string): string {
        return apiVersion.toLowerCase().replace(/[^0-9a-z]+/g, "-");
    }

    public static sanitizeVersionSetId(apiNamePrefix: string, suffix: string): string {
        return md5(`${apiNamePrefix}-${suffix}`);
    }

    public static sanitizeVersionSetDisplayName(apiTitle: string): string {
        return `${apiTitle}`;
    }

    public static sanitizeApiId(apiNamePrefix: string, versionIdentity: string, suffix: string): string {
        return `${apiNamePrefix}-${versionIdentity}-${suffix}`;
    }

    public static sanitizeApiPath(apiNamePrefix: string, suffix: string): string {
        return `${apiNamePrefix}-${suffix}`;
    }
}
