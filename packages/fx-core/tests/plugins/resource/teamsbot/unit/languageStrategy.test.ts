// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import 'mocha';
import * as chai from 'chai';
import * as sinon from 'sinon';

import { LanguageStrategy } from '../../src/languageStrategy';
import { ProgrammingLanguage } from '../../src/enums/programmingLanguage';
import { TemplateProjectsConstants } from '../../src/constants';

describe('Language Strategy', () => {
    describe('getTemplateProjectZip', () => {
        it('Fetch From Public Url', async () => {
            // Arrange
            const programmingLanguage = ProgrammingLanguage.JavaScript;
            const group_name = TemplateProjectsConstants.GROUP_NAME_BOT;

            // Act
            const zip = await LanguageStrategy.getTemplateProjectZip(programmingLanguage, group_name);

            // Assert
            chai.assert.isNotNull(zip);
        });

        it('Fetch From Local', async () => {
            // Arrange
            const programmingLanguage = ProgrammingLanguage.JavaScript;
            const group_name = TemplateProjectsConstants.GROUP_NAME_BOT;
            sinon.stub(LanguageStrategy, 'getTemplateProjectZipUrl').resolves('');

            // Act
            const zip = await LanguageStrategy.getTemplateProjectZip(programmingLanguage, group_name);

            // Assert
            chai.assert.isNotNull(zip);
        });
    });
});