// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import AdmZip from "adm-zip";
import axios from "axios";

import * as templates from "../../../../../src/common/templates";
import { FunctionPluginInfo } from "../../../../../src/plugins/resource/function/constants";
import { fetchZipFromURL, getTemplateURL, requestWithRetry } from "../../../../../src/plugins/resource/function/utils/templates-fetch";
import { FunctionLanguage } from "../../../../../src/plugins/resource/function/enums";

const candidateTag = templates.tagPrefix + templates.templatesVersion.replace(/\*/g, "0");
const targetTag = templates.tagPrefix + templates.templatesVersion.replace(/\*/g, "1");

const manifest = `
templates@0.2.0
templates@0.1.1
templates@0.1.1-alpha
templates@0.2.1
templates@0.3.1
${candidateTag}
${targetTag}
`;

describe(FunctionPluginInfo.pluginName, () => {
    describe("Template Fetch Test", () => {
        afterEach(() => {
            sinon.restore();
        });

        it("Test getTemplateURL", async () => {
            // Arrange
            sinon.stub(axios, "get").resolves({status: 200, data: manifest});

            // Act
            const url = await getTemplateURL("a", FunctionLanguage.JavaScript, "c");

            // Assert
            chai.assert.equal(url, templates.templateURL(targetTag, "a.js.c"));
        });

        it("Test fetchZipFromURL", async () => {
            // Arrange
            sinon.stub(axios, "get").resolves({status: 200, data: new AdmZip().toBuffer()});

            // Act
            const zip = await fetchZipFromURL("ut");

            // Assert
            chai.assert.equal(zip.getEntries().length, 0);
        });

        it("Test requestWithRetry", async () => {
            // Arrange
            let cnt = 1;
            const fn = async (): Promise<any> => {
                if (cnt-- > 0) {
                    throw { response: {status: 500 }};
                }
                return { status: 200 };
            };

            // Act
            const res = await requestWithRetry(2, fn);

            // Assert
            chai.assert.deepEqual(res, { status: 200 } as any);
        });
    });
});
