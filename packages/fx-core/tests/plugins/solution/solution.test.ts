// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { expect } from "chai";
import { it } from "mocha";
import { TeamsAppSolution } from ' ../../../src/plugins/solution';
import { ConfigMap, PluginContext, ReadonlySolutionConfig, SolutionConfig, SolutionContext, TeamsAppManifest } from 'fx-api';
import * as sinon from 'sinon';
import fs from 'fs-extra'
import { GLOBAL_CONFIG, PERMISSION_REQUEST } from '../../../src/plugins/solution/fx-solution/constants';

function mockSolutionContext(): SolutionContext {
    let config: SolutionConfig = new Map;
    return {
        root: '.',
        app: new TeamsAppManifest,
        config,
        answers: new ConfigMap
    }
}

describe('Solution running state on creation', () => {
    let solution = new TeamsAppSolution();
    it('should be idle', () => {
        expect(solution.runningState).equal('idle');
    });
});

describe('Solution create()', async () => {
    let mocker = sinon.createSandbox();
    let permissionsJsonPath = './permissions.json';
    beforeEach(() => {
        mocker.stub(fs, 'writeFile').resolves();
        mocker.stub(fs, 'writeJSON').resolves();
        // Uses stub<any, any> to circumvent type check. Beacuse sinon fails to mock my target overload of readJson.
        mocker.stub<any, any>(fs, 'readJson').withArgs(permissionsJsonPath).resolves({});
        mocker.stub<any, any>(fs, 'pathExists').withArgs(permissionsJsonPath).resolves(true);
        mocker.stub<any, any>(fs, 'copy').resolves();
    });


    it('should fill in global config', async () => {
        let solution = new TeamsAppSolution();
        let mockedSolutionCtx = mockSolutionContext();
        let result = await solution.create(mockedSolutionCtx);
        expect(result.isErr()).equals(true);
        // expect(mockedSolutionCtx.config.get(GLOBAL_CONFIG)).to.be.not.undefined;
    });

    it('should update permissions in global config', async () => {
        let solution = new TeamsAppSolution();
        let mockedSolutionCtx = mockSolutionContext();
        let result = await solution.create(mockedSolutionCtx);
        expect(result.isErr()).equals(true);
        // expect(mockedSolutionCtx.config.get(GLOBAL_CONFIG)?.get(PERMISSION_REQUEST)).to.be.not.undefined;
        // expect(mockedSolutionCtx.config.get(GLOBAL_CONFIG)?.get(PERMISSION_REQUEST)).equals('{}');
    });


    afterEach(() => {
        mocker.restore()
    });
});