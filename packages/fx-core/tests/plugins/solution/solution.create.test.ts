// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { expect } from "chai";
import { it } from "mocha";
import { TeamsAppSolution } from " ../../../src/plugins/solution";
import { ConfigMap, SolutionConfig, SolutionContext, TeamsAppManifest } from "fx-api";
import * as sinon from "sinon";
import fs from "fs-extra"
import { GLOBAL_CONFIG, PROGRAMMING_LANGUAGE, SolutionError } from "../../../src/plugins/solution/fx-solution/constants";
import { AzureSolutionQuestionNames, BotOptionItem } from "../../../src/plugins/solution/fx-solution/question";

describe("Solution running state on creation", () => {
    let solution = new TeamsAppSolution();
    it("should be idle", () => {
        expect(solution.runningState).equal("idle");
    });
});

describe("Solution create()", async () => {
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

    let mocker = sinon.createSandbox();
    let permissionsJsonPath = "./permissions.json";
    beforeEach(() => {
        mocker.stub(fs, "writeFile").resolves();
        mocker.stub(fs, "writeJSON").resolves();
        // Uses stub<any, any> to circumvent type check. Beacuse sinon fails to mock my target overload of readJson.
        mocker.stub<any, any>(fs, "readJson").withArgs(permissionsJsonPath).resolves({});
        mocker.stub<any, any>(fs, "pathExists").withArgs(permissionsJsonPath).resolves(true);
        mocker.stub<any, any>(fs, "copy").resolves();
    });


    it("should fail if projectSettings is undefined", async () => {
        let solution = new TeamsAppSolution();
        let mockedSolutionCtx = mockSolutionContext();
        let result = await solution.create(mockedSolutionCtx);
        expect(result.isErr()).equals(true);
        expect(result._unsafeUnwrapErr().name).equals(SolutionError.InternelError);
        // expect(mockedSolutionCtx.config.get(GLOBAL_CONFIG)).to.be.not.undefined;
    });

    it("should fail if projectSettings.solutionSettings is undefined", async () => {
        let solution = new TeamsAppSolution();
        let mockedSolutionCtx = mockSolutionContext();
        mockedSolutionCtx.projectSettings = {
            appName: "my app",
            solutionSettings: undefined
        };
        let result = await solution.create(mockedSolutionCtx);
        expect(result.isErr()).equals(true);
        expect(result._unsafeUnwrapErr().name).equals(SolutionError.InternelError);
    });

    it("should fail if capability is empty", async () => {
        let solution = new TeamsAppSolution();
        let mockedSolutionCtx = mockSolutionContext();
        mockedSolutionCtx.projectSettings = {
            appName: "my app",
            solutionSettings: {
                name: "azure",
                version: "1.0"
            }
        };
        let result = await solution.create(mockedSolutionCtx);
        expect(result.isErr()).equals(true);
        expect(result._unsafeUnwrapErr().name).equals(SolutionError.InternelError);
    });

    it("should succeed if projectSettings, solution settings and capabilities are provided", async () => {
        let solution = new TeamsAppSolution();
        let mockedSolutionCtx = mockSolutionContext();
        mockedSolutionCtx.projectSettings = {
            appName: "my app",
            solutionSettings: {
                name: "azure",
                version: "1.0"
            }
        };
        mockedSolutionCtx.answers?.set(AzureSolutionQuestionNames.Capabilities, [BotOptionItem.id]);
        let result = await solution.create(mockedSolutionCtx);
        expect(result.isOk()).equals(true);
        expect(mockedSolutionCtx.config.get(GLOBAL_CONFIG)).is.not.undefined;
    });

    it("should set programmingLanguage in config if programmingLanguage is in answers", async () => {
        let solution = new TeamsAppSolution();
        let mockedSolutionCtx = mockSolutionContext();
        mockedSolutionCtx.projectSettings = {
            appName: "my app",
            solutionSettings: {
                name: "azure",
                version: "1.0"
            }
        };
        mockedSolutionCtx.answers?.set(AzureSolutionQuestionNames.Capabilities, [BotOptionItem.id]);
        const programmingLanguage = "TypeScript";
        mockedSolutionCtx.answers?.set(AzureSolutionQuestionNames.ProgrammingLanguage, programmingLanguage);
        const result = await solution.create(mockedSolutionCtx);
        expect(result.isOk()).equals(true);
        const lang = mockedSolutionCtx.config.get(GLOBAL_CONFIG)?.getString(PROGRAMMING_LANGUAGE);
        expect(lang).equals(programmingLanguage);
    });

    it("shouldn't set programmingLanguage in config if programmingLanguage is not in answers", async () => {
        let solution = new TeamsAppSolution();
        let mockedSolutionCtx = mockSolutionContext();
        mockedSolutionCtx.projectSettings = {
            appName: "my app",
            solutionSettings: {
                name: "azure",
                version: "1.0"
            }
        };
        mockedSolutionCtx.answers?.set(AzureSolutionQuestionNames.Capabilities, [BotOptionItem.id]);
        const result = await solution.create(mockedSolutionCtx);
        expect(result.isOk()).equals(true);
        const lang = mockedSolutionCtx.config.get(GLOBAL_CONFIG)?.getString(PROGRAMMING_LANGUAGE);
        expect(lang).to.be.undefined;
    });


    afterEach(() => {
        mocker.restore()
    });
});