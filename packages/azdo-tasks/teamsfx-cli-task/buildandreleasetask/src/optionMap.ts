// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MultipleOptions } from "./enums/multipleOptions";
import { SingleOptions } from "./enums/singleOptions";

export class OptionMap {
    static optionMap: Map<string, string[]> = new Map([
        ['account', [SingleOptions.Action]],
        ['new', [SingleOptions.Interactive, SingleOptions.Scratch, MultipleOptions.Capabilities, SingleOptions.HostType, SingleOptions.SpfxFrameworkType, SingleOptions.SpfxWebpartDesp,
            SingleOptions.SpfxWebpartName, MultipleOptions.AzureResources, SingleOptions.WayToRegisterBot, SingleOptions.BotId, SingleOptions.BotPassword,
            SingleOptions.ProgrammingLanguage, SingleOptions.Folder, SingleOptions.AppName, SingleOptions.Samples
        ]],
        ['capability', []],
        ['resource', []],
        ['provision', [
            SingleOptions.Subscription, SingleOptions.SqlAdminName, SingleOptions.SqlPassword,
            SingleOptions.Folder
        ]],
        ['deploy', [
            SingleOptions.OpenApiDocument, SingleOptions.ApiPrefix, SingleOptions.ApiVersion,
            SingleOptions.Folder
        ]],
        ['init', [
            SingleOptions.AppName, SingleOptions.Environment, SingleOptions.Endpoint,
            SingleOptions.RootPath
        ]],
        ['build', [
            SingleOptions.Folder
        ]],
        ['validate', [
            SingleOptions.Folder
        ]],
        ['publish', [
            SingleOptions.Folder
        ]],
        ['config', [
            SingleOptions.Folder
        ]]
    ]) 

    static validOptionInCommand(command: string, option: string): boolean {
        const result = OptionMap.optionMap.get(command)?.includes(option)
        return result === undefined ? false : result
    }
}
