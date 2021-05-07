// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { OptionItem } from "fx-api";

export const manuallySubmitOption: OptionItem = {
    id: "ManuallySubmit",
    label: "Manually submit Teams app package file",
    detail: "Build the Teams app package. You will need to send it to your Teams administrator manually."
};

export const autoPublishOption: OptionItem = {
    id: "AutoPublish",
    label: "Install for you organization",
    detail: "Send your app to your Teams adminsitrator for approval via the Teams App Portal."
};