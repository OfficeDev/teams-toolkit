// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/* eslint-disable @typescript-eslint/no-extraneous-class */
import path from 'path'

export class ActionInputs {
  static readonly Commands: string = 'commands'
}

export class Commands {
  static readonly TeamsfxCliName: string = 'npx teamsfx'
  static readonly AddOptionPrefix = (optionName: string): string =>
    `--${optionName}`
  static readonly NpmInstall: string = 'npm install'
}

export class ErrorNames {
  static readonly InputsError: string = 'InputsError'
  static readonly InternalError: string = 'InternalError'
}

export class Suggestions {
  static readonly RerunWorkflow: string =
    'Please rerun the workflow or pipeline.'
  static readonly CreateAnIssue: string = 'Please create an issue on GitHub.'
}

export function TeamsfxCliPath(workdir: string = '.') {
  return path.join(workdir, 'node_modules', '@microsoft', 'teamsfx-cli')
}
