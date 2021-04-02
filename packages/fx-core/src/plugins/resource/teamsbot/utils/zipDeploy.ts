// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ValidationException } from '../exceptions';
import { isNameValidInUrl } from './common';

export function getZipDeployEndpoint(siteName: string): string {
    if (!isNameValidInUrl(siteName)) {
        throw new ValidationException('siteName', siteName);
    }

    return `https://${siteName}.scm.azurewebsites.net/api/zipdeploy`;
}
