// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { OptionItem } from "fx-api";

export const manuallySubmitOption: OptionItem = {
    id: "ManuallySubmit",
    label: "Manually submit Teams package file",
    detail: "Build Teams package file and manually send it to your admin to check"
};

export const autoPublishOption: OptionItem = {
    id: "AutoPublish",
    label: "Install for you organization",
    detail: "Send your app to the admin portal for your admin to approve. Once approved, your app will be available for your organization"
};