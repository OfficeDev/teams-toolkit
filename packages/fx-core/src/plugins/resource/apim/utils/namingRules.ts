// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import md5 from "md5";
import { ValidationConstants } from "../constants";
import { BuildError, ShortenToEmpty } from "../error";

export interface INamingRule {
    maxLength?: number;
    minLength?: number;
    validPattern: IValidPattern;
}

export interface ISanitizer {
    sanitize: (...params: string[]) => string;
}

export interface IValidPattern {
    regex: RegExp;
    message: string;
}

export class NamingRules {
    static apiPrefix: INamingRule & ISanitizer = {
        minLength: ValidationConstants.defaultMinLength,
        maxLength: 40,
        validPattern: ValidationConstants.resourceIdValidPattern,
        sanitize: (apiTitle: string): string => {
            return NamingRules.short(NamingRules.sanitizeId(apiTitle, true, true), 40);
        }
    }

    static versionIdentity: INamingRule & ISanitizer = {
        minLength: ValidationConstants.defaultMinLength,
        maxLength: 15,
        validPattern: ValidationConstants.resourceIdValidPattern,
        sanitize: (apiVersion: string): string => {
            return NamingRules.short(NamingRules.sanitizeId(apiVersion, true, true), 15);
        }
    }

    static resourceGroupName: INamingRule = {
        minLength: ValidationConstants.defaultMinLength,
        maxLength: 90,
        validPattern: ValidationConstants.resourceGroupValidPattern,
    }

    static apimServiceName: INamingRule & ISanitizer = {
        minLength: ValidationConstants.defaultMinLength,
        maxLength: 50,
        validPattern: ValidationConstants.serviceIdValidPattern,
        sanitize(appName: string, suffix: string): string {
            return `${NamingRules.short(appName, 48 - suffix.length)}am${suffix}`;
        }
    }

    static productId: INamingRule & ISanitizer = {
        minLength: ValidationConstants.defaultMinLength,
        maxLength: ValidationConstants.defaultMaxLength,
        validPattern: ValidationConstants.defaultValidPattern,
        sanitize(appName: string, suffix: string): string {
            return `${NamingRules.short(appName, 80 - suffix.length - 9)}-${suffix}-product`;
        }
    };

    static oAuthServerId: INamingRule & ISanitizer = {
        minLength: ValidationConstants.defaultMinLength,
        maxLength: ValidationConstants.defaultMaxLength,
        validPattern: ValidationConstants.defaultValidPattern,
        sanitize(appName: string, suffix: string): string {
            return `${NamingRules.short(appName, 80 - suffix.length - 8)}-${suffix}-server`;
        }
    };

    static versionSetId: INamingRule & ISanitizer = {
        minLength: ValidationConstants.defaultMinLength,
        maxLength: ValidationConstants.defaultMaxLength,
        validPattern: ValidationConstants.defaultValidPattern,
        sanitize(apiNamePrefix: string, suffix: string): string {
            return md5(`${apiNamePrefix}-${suffix}`);
        }
    }

    static apiPath: INamingRule & ISanitizer = {
        minLength: ValidationConstants.defaultMinLength,
        maxLength: ValidationConstants.defaultMaxLength,
        validPattern: ValidationConstants.defaultValidPattern,
        sanitize(apiNamePrefix: string, suffix: string): string {
            return `${NamingRules.short(apiNamePrefix, ValidationConstants.defaultMaxLength - suffix.length - 1)}-${suffix}`;
        }
    }

    static apiId: INamingRule & ISanitizer = {
        minLength: ValidationConstants.defaultMinLength,
        maxLength: 80,
        validPattern: ValidationConstants.resourceIdValidPattern,
        sanitize(apiNamePrefix: string, versionIdentity: string, suffix: string): string {
            return `${NamingRules.short(apiNamePrefix, 40)}-${NamingRules.short(suffix, 20)}-${NamingRules.short(versionIdentity, 15)}`;
        }
    }

    static apimClientAADObjectId: INamingRule = {
        validPattern: ValidationConstants.guidValidPattern
    }
    static apimClientAADClientId: INamingRule = {
        validPattern: ValidationConstants.guidValidPattern
    }

    static aadDisplayName: ISanitizer = {
        sanitize(appName: string): string {
            return `${NamingRules.short(appName, ValidationConstants.defaultMaxLength - 7)}-client`;
        }
    }

    static aadSecretDisplayName: ISanitizer = {
        sanitize(appName: string): string {
            return NamingRules.short(appName, ValidationConstants.defaultMaxLength);
        }
    }

    static versionSetDisplayName: ISanitizer = {
        sanitize(apiTitle: string): string {
            return NamingRules.short(apiTitle, ValidationConstants.defaultMaxLength);
        }
    }

    static validate(value: string, namingRule: INamingRule): string | undefined {
        if (namingRule.minLength && value.length < namingRule.minLength) {
            return `The value should be longer than ${namingRule.minLength}.`;
        }
        if (namingRule.maxLength && value.length > namingRule.maxLength) {
            return `The value should be shorter than ${namingRule.maxLength}.`;
        }
        if (!namingRule.validPattern.regex.test(value)) {
            return namingRule.validPattern.message;
        }
        return undefined;
    }

    static sanitizeId(str: string, lowerCase: boolean, startWithNumber: boolean): string {
        str = lowerCase ? str.toLowerCase() : str;
        str = str.replace(/[^0-9a-zA-Z]+/g, "-");
        str = startWithNumber ? str.replace(/^[-]+/, "") : str.replace(/^[-0-9]+/, "");
        return str.replace(/-$/, "");
    }

    static short(str: string, maxLength: number): string {
        if (maxLength <= 0) {
            throw BuildError(ShortenToEmpty, str);
        }
        
        const result = str.substring(0, maxLength);
        return result;
    }
}