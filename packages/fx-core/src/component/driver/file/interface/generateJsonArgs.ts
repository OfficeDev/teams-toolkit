// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

<<<<<<< HEAD
export interface JsonContent {
=======
interface JsonContent {
>>>>>>> dev
  [key: string]: any;
}

export interface GenerateJsonArgs {
  target: string; // The path of the json file
  appsettings: JsonContent | undefined;
  content: JsonContent | undefined;
}
