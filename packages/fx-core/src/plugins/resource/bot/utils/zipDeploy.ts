// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ValidationError } from "../errors";
import { isNameValidInUrl } from "./common";

export function getZipDeployEndpoint(siteName: string): string {
    if (!isNameValidInUrl(siteName)) {
        throw new ValidationError("siteName", siteName);
    }

    return `https://${siteName}.scm.azurewebsites.net/api/zipdeploy`;
}
