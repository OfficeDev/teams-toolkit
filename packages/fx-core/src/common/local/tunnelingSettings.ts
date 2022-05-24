// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";

/**
 * This file contains utility functions for core/solution to read tunneling settings and cli/vsc to set tunneling settings.
 */

export enum TunnelingService {
  None = "none",
  Ngrok = "ngrok",
  MicrosoftTunneling = "microsoftTunneling",
}

export function getTunnelingService(inputs: Inputs): TunnelingService {
  return inputs.tunnelingService in Object.values(TunnelingService)
    ? inputs.tunnelingService
    : TunnelingService.Ngrok;
}

export function setTunnelingService(inputs: Inputs, value: TunnelingService): void {
  inputs.tunnelingService = value;
}
