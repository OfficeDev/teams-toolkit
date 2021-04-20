// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Interface for Publishing Status in Teams App Catalog
 */
export interface IPublishingAppDenition {
    lastModifiedDateTime: Date | null;
    publishingState: PublishingState,
    /**
     * Teams app id in tenant App Catalog
     */
    teamsAppId: string
}

export enum PublishingState {
    submitted = "submitted",
    published = "published",
    rejected = "rejected"
}