// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import md5 from "md5";

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

const DefaultMaxLength = 256;

const GuidValidPattern: IValidPattern = {
    regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    message: "The value should be a GUID."
}

const DefaultValidPattern: IValidPattern = {
    regex: /^[^*#&+:<>?]+$/,
    message: "The value cannot contain any character in '*#&+:<>?'.",
}

const testResourceGroupValidPattern: IValidPattern = {
    regex: /^[-\w\._\(\)]+$/,
    message: "The value can include alphanumeric, underscore, parentheses, hyphen, period (except at end), and unicode characters that match the allowed characters.",
}

const ServiceIdValidPattern: IValidPattern = {
    regex: /^[a-zA-Z](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
    message: "The value can contain only letters, numbers and hyphens. The first character must be a letter and last character must be a letter or a number.",
}

const ResourceIdValidPattern: IValidPattern = {
    regex: /^[0-9a-zA-Z](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
    message: "The value can contain only numbers, letters, and hyphens when preceded and followed by number or a letter.",
}

export class NamingRules {
    static apiPrefix: INamingRule & ISanitizer = {
        minLength: 1,
        maxLength: 40,
        validPattern: ServiceIdValidPattern,
        sanitize: (apiTitle: string): string => {
            return short(sanitizeId(apiTitle, true, false), 40);
        }
    }

    static versionIdentity: INamingRule & ISanitizer = {
        minLength: 1,
        maxLength: 15,
        validPattern: ResourceIdValidPattern,
        sanitize: (apiVersion: string): string => {
            return short(sanitizeId(apiVersion, true, false), 15);
        }
    }

    static resourceGroupName: INamingRule = {
        minLength: 1,
        maxLength: 90,
        validPattern: testResourceGroupValidPattern,
    }

    static apimServiceName: INamingRule & ISanitizer = {
        minLength: 1,
        maxLength: 50,
        validPattern: ServiceIdValidPattern,
        sanitize(appName: string, suffix: string): string {
            return `${short(appName, 48 - suffix.length)}am${suffix}`;
        }
    }

    static productId: INamingRule & ISanitizer = {
        minLength: 1,
        maxLength: DefaultMaxLength,
        validPattern: DefaultValidPattern,
        sanitize(appName: string, suffix: string): string {
            return `${short(appName, 80 - suffix.length - 9)}-${suffix}-product`;
        }
    };

    static oAuthServerId: INamingRule & ISanitizer = {
        minLength: 1,
        maxLength: DefaultMaxLength,
        validPattern: DefaultValidPattern,
        sanitize(appName: string, suffix: string): string {
            return `${short(appName, 80 - suffix.length - 8)}-${suffix}-server`;
        }
    };

    static versionSetId: INamingRule & ISanitizer = {
        minLength: 1,
        maxLength: DefaultMaxLength,
        validPattern: DefaultValidPattern,
        sanitize(apiNamePrefix: string, suffix: string): string {
            return md5(`${apiNamePrefix}-${suffix}`);
        }
    }

    static apiPath: INamingRule & ISanitizer = {
        minLength: 1,
        maxLength: DefaultMaxLength,
        validPattern: DefaultValidPattern,
        sanitize(apiNamePrefix: string, suffix: string): string {
            return `${short(apiNamePrefix, DefaultMaxLength - suffix.length - 1)}-${suffix}`;
        }
    }

    static apiId: INamingRule & ISanitizer = {
        minLength: 1,
        maxLength: 80,
        validPattern: ResourceIdValidPattern,
        sanitize(apiNamePrefix: string, versionIdentity: string, suffix: string): string {
            return `${short(apiNamePrefix, 40)}-${short(suffix, 20)}-${short(versionIdentity, 15)}`;
        }
    }

    static apimClientAADObjectId: INamingRule = {
        validPattern: GuidValidPattern
    }
    static apimClientAADClientId: INamingRule = {
        validPattern: GuidValidPattern
    }

    static aadDisplayName: ISanitizer = {
        sanitize(appName: string): string {
            return `${short(appName, DefaultMaxLength - 7)}-client`;
        }
    }

    static aadSecretDisplayName: ISanitizer = {
        sanitize(appName: string): string {
            return short(appName, DefaultMaxLength);
        }
    }

    static versionSetDisplayName: ISanitizer = {
        sanitize(apiTitle: string): string {
            return short(apiTitle, DefaultMaxLength);
        }
    }

    static validate(value: string, namingRule: INamingRule): string | undefined {
        if (namingRule.minLength && value.length < namingRule.minLength) {
            return `The value should be longer than ${namingRule.minLength}.`
        }
        if (namingRule.maxLength && value.length > namingRule.maxLength) {
            return `The value should be shorter than ${namingRule.maxLength}.`
        }
        if (!namingRule.validPattern.regex.test(value)) {
            return namingRule.validPattern.message;
        }
        return undefined;
    }
}

export function sanitizeId(str: string, lowerCase: boolean, startWithNumber: boolean): string {
    str = lowerCase ? str.toLowerCase() : str;
    str = str.replace(/[^0-9a-zA-Z]+/g, "-");
    str = startWithNumber ? str.replace(/^[-]+/, "") : str.replace(/^[-0-9]+/, "");
    return str.replace(/-$/, "");
}

export function short(str: string, maxLength: number) {
    if (maxLength <= 0) {

    }
    return str.substring(0, maxLength);
}