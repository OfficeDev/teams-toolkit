// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {Inputs, Solution} from "@microsoft/teamsfx-api";
import { TeamsAppSolution } from "../plugins/solution/fx-solution/solution";
export interface SolutionLoader{
  loadSolution(inputs: Inputs):Promise<Solution>;
  loadGlobalSolutions(inputs: Inputs):Promise<Solution[]>;
}


export class DefaultSolutionLoader implements SolutionLoader{
  async loadSolution(inputs: Inputs): Promise<Solution> {
    return new TeamsAppSolution();
  }
  async loadGlobalSolutions(inputs: Inputs): Promise<Solution[]> {
    return [new TeamsAppSolution()];
  }
}


export const defaultSolutionLoader = new DefaultSolutionLoader();