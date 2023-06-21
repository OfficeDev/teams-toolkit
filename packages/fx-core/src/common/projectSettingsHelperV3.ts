// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ComponentNames } from "../component/constants";
import { getComponent } from "../component/workflow";

export function hasFunctionBot(projectSettings: any): boolean {
  const botComponent = getComponent(projectSettings, ComponentNames.TeamsBot);
  if (!botComponent) return false;
  return botComponent.hosting === ComponentNames.Function;
}
