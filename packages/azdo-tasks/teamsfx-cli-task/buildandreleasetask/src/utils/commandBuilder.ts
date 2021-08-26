// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as tl from 'azure-pipelines-task-lib/task'
import {ActionInputs, Commands, Strings} from '../constant'
import {MultipleOptions} from '../enums/multipleOptions'
import {SingleOptions} from '../enums/singleOptions'
import {OptionMap} from '../optionMap'

export function BuildCommandString(): string {
  const commands = tl.getDelimitedInput(ActionInputs.Commands, Strings.NewLine) || []
  const subCommand = commands[0] ?? ''
  // Iterate to collect options.
  const optionsPart: string[] = []

  for (const optionName of Object.values<string>(SingleOptions)) {
    if (!OptionMap.validOptionInCommand(subCommand, optionName)) {
      continue;
    }
    const optionValue = tl.getInput(optionName)
    if (optionValue) {
      optionsPart.push(
        [Commands.AddOptionPrefix(optionName), optionValue].join(
          Commands.CommandSpace
        )
      )
    }
  }

  for (const optionName of Object.values<string>(MultipleOptions)) {
    if (!OptionMap.validOptionInCommand(subCommand, optionName)) {
      continue;
    }
    const optionValues = tl.getDelimitedInput(optionName, Strings.NewLine) || []
    if (optionValues.length > 0) {
      optionsPart.push(
        `${Commands.AddOptionPrefix(optionName)} ${optionValues.join(
          Commands.CommandSpace
        )}`
      )
    }
  }

  return [Commands.TeamsfxCliName]
    .concat(commands)
    .concat(optionsPart)
    .join(Strings.Space)
}
