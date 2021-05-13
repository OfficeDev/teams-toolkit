// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import { capitalizeFirstLetter, getFileExtension } from "../../../../src/plugins/resource/apim/utils/commonUtils";

describe("Util", () => {
    describe("#getFileExtension()", () => {
        const testInput: { input: string; output: string }[] = [
            { input: "", output: "" },
            { input: ".", output: "" },
            { input: "./.tmp", output: "" },
            { input: "//", output: "" },
            { input: "/", output: "" },
            { input: "test/data.txt", output: "txt" },
            { input: "data", output: "" },
            { input: "data.txt/data", output: "" },
            { input: "data.txt.tmp", output: "tmp" },
        ];
        testInput.forEach((data) => {
            it(`file path: ${data.input}`, () => {
                chai.expect(getFileExtension(data.input)).to.equal(data.output);
            });
        });
    });

    describe("#capitalizeFirstLetter()", () => {
        const testInput: { input: string; output: string }[] = [
            { input: "", output: "" },
            { input: "a", output: "A" },
            { input: ".", output: "." },
            { input: "ab", output: "Ab" },
            { input: "a.", output: "A." },
            { input: " a", output: " a" },
            { input: "data", output: "Data" },
            { input: "input data", output: "Input data" },
            { input: "Data", output: "Data" },
        ];
        testInput.forEach((data) => {
            it(`file path: ${data.input}`, () => {
                chai.expect(capitalizeFirstLetter(data.input)).to.equal(data.output);
            });
        });
    });
});
