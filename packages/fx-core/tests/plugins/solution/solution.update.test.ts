// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { expect } from "chai";
import { it } from "mocha";
import { TeamsAppSolution } from " ../../../src/plugins/solution";
import { ConfigMap, SolutionConfig, SolutionContext, TeamsAppManifest } from "fx-api";
import { GLOBAL_CONFIG, PROGRAMMING_LANGUAGE, SolutionError } from "../../../src/plugins/solution/fx-solution/constants";
import { AzureSolutionQuestionNames, BotOptionItem } from "../../../src/plugins/solution/fx-solution/question";

function mockSolutionContext(): SolutionContext {
    let config: SolutionConfig = new Map;
    return {
        root: ".",
        app: new TeamsAppManifest,
        config,
        answers: new ConfigMap,
        projectSettings: undefined
    }
}

describe("update()", () => {
    let solution = new TeamsAppSolution();
    it("should return error if answers is undefined", async () => {
        let solution = new TeamsAppSolution();
        let mockedCtx = mockSolutionContext();
        mockedCtx.answers = undefined;
        let result = await solution.create(mockedCtx);
        expect(result.isErr()).equals(true);
        expect(result._unsafeUnwrapErr().name).equals(SolutionError.InternelError);
    });

});
