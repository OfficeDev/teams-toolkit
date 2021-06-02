// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Inputs, Solution } from "@microsoft/teamsfx-api";
import { TeamsAppSolution } from "../../plugins";
 

export async function loadSolution(inputs: Inputs):Promise<Solution>{
  return new TeamsAppSolution(); 
}

export async function loadGlobalSolutions(inputs: Inputs):Promise<Solution[]>{
  return [new TeamsAppSolution()]; 
}