// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import 'mocha';
import * as chai from 'chai';
import { ApimPluginConfigKeys, TeamsToolkitComponent, SolutionConfigKeys } from '../../src/constants';
import { ApimPluginConfig, SolutionConfig } from '../../src/model/config';
import { ConfigValue, PluginIdentity, ReadonlyPluginConfig } from 'teamsfx-api';

describe('config', () => {
    describe('SolutionConfig', () => {
        const configContent = new Map<PluginIdentity, ReadonlyPluginConfig>([
            [
                TeamsToolkitComponent.Solution,
                new Map<string, ConfigValue>([
                    [SolutionConfigKeys.subscriptionId, 'test-subscription-id'],
                    [SolutionConfigKeys.resourceNameSuffix, 1],
                ]),
            ],
        ]);

        const solutionConfig = new SolutionConfig(configContent);

        it('Undefined property', () => {
            chai.expect(() => solutionConfig.tenantId).to.throw("Project configuration 'tenantId' of solution is missing in 'env.default.json'. Please retry to provision resource or set the value manually.");
        });
        it('Error type property', () => {
            chai.expect(() => solutionConfig.resourceNameSuffix).to.throw(
                "Property 'resourceNameSuffix' is not type 'string'",
            );
        });
        it('Property with value', () => {
            chai.expect(solutionConfig.subscriptionId).to.equal('test-subscription-id');
        });
    });

    describe('ApimPluginConfig', () => {
        const configContent = new Map<string, ConfigValue>([
            [ApimPluginConfigKeys.resourceGroupName, 'test-resource-group-name'],
            [ApimPluginConfigKeys.serviceName, 1],
        ]);

        const apimPluginConfig = new ApimPluginConfig(configContent);
        it('Undefined property', () => {
            chai.expect(apimPluginConfig.apiPath).to.equal(undefined);
        });
        it('Error type property', () => {
            chai.expect(() => apimPluginConfig.serviceName).to.throw("Property 'serviceName' is not type 'string'");
        });
        it('Property with value', () => {
            chai.expect(apimPluginConfig.resourceGroupName).to.equal('test-resource-group-name');
        });
    });
});
