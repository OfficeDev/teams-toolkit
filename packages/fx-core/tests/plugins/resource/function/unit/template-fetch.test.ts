// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import AdmZip from "adm-zip";
import axios from "axios";

import { FunctionPluginInfo } from "../../../../../src/plugins/resource/function/constants";
import { fetchZipFromURL, getTemplateURL, requestWithRetry } from "../../../../../src/plugins/resource/function/utils/templates-fetch";

const manifest = {
    a: {
        b: {
            c: [
                {
                    version: "0.1.0",
                    url: "url1"
                },
                {
                    version: "0.2.0",
                    url: "url2"
                },
                {
                    version: "0.1.3",
                    url: "url3"
                },
                {
                    version: "0.1.2",
                    url: "url4"
                }
            ]
        }
    }
};

describe(FunctionPluginInfo.pluginName, () => {
    describe("Template Fetch Test", () => {
        afterEach(() => {
            sinon.restore();
        });

        it("Test getTemplateURL", async () => {
            // Arrange
            sinon.stub(axios, "get").resolves({status: 200, data: manifest});

            // Act
            const url = await getTemplateURL("", "a", "b", "c", "0.1.*");

            // Assert
            chai.assert.equal(url, "url3");
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
