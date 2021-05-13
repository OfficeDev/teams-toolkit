// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import { NamingRules } from "../../../../src/plugins/resource/apim/utils/namingRules";

describe("NamingRules", () => {
    describe("#sanitizeId()", () => {
        const testData: { input: string, id: string, lowerCase: string, removeLeadingNumber: string, all: string }[] =
            [
                { input: "", id: "", lowerCase: "", removeLeadingNumber: "", all: "" },
                { input: "   ", id: "", lowerCase: "", removeLeadingNumber: "", all: "" },
                { input: "#$%^*", id: "", lowerCase: "", removeLeadingNumber: "", all: "" },
                { input: "-", id: "", lowerCase: "", removeLeadingNumber: "", all: "" },
                { input: "  -  ", id: "", lowerCase: "", removeLeadingNumber: "", all: "" },
                { input: "-ab-cd-", id: "ab-cd", lowerCase: "ab-cd", removeLeadingNumber: "ab-cd", all: "ab-cd" },
                { input: "-$ab-cd-@", id: "ab-cd", lowerCase: "ab-cd", removeLeadingNumber: "ab-cd", all: "ab-cd" },
                { input: "  ab cd ", id: "ab-cd", lowerCase: "ab-cd", removeLeadingNumber: "ab-cd", all: "ab-cd" },
                { input: "12AB12 cd ", id: "12AB12-cd", lowerCase: "12ab12-cd", removeLeadingNumber: "AB12-cd", all: "ab12-cd" },
                { input: "12-$AB12 cd ", id: "12-AB12-cd", lowerCase: "12-ab12-cd", removeLeadingNumber: "AB12-cd", all: "ab12-cd" },
                { input: "123", id: "123", lowerCase: "123", removeLeadingNumber: "", all: "" },
                { input: "abc", id: "abc", lowerCase: "abc", removeLeadingNumber: "abc", all: "abc" },
                { input: "ABC", id: "ABC", lowerCase: "abc", removeLeadingNumber: "ABC", all: "abc" },
                { input: "abc123abc", id: "abc123abc", lowerCase: "abc123abc", removeLeadingNumber: "abc123abc", all: "abc123abc" },
                { input: "ABC123", id: "ABC123", lowerCase: "abc123", removeLeadingNumber: "ABC123", all: "abc123" },
            ];
        testData.forEach((data) => {
            it(`Enable nothing, "${data.input}" -> "${data.id}"`, () => {
                chai.assert.equal(NamingRules.sanitizeId(data.input, false, true), data.id);
            });
            it(`Enable lowercase, "${data.input}" -> "${data.lowerCase}"`, () => {
                chai.assert.equal(NamingRules.sanitizeId(data.input, true, true), data.lowerCase);
            });
            it(`Enable remove leading number, "${data.input}" -> "${data.removeLeadingNumber}"`, () => {
                chai.assert.equal(NamingRules.sanitizeId(data.input, false, false), data.removeLeadingNumber);
            });
            it(`Enable all, "${data.input}" -> "${data.all}"`, () => {
                chai.assert.equal(NamingRules.sanitizeId(data.input, true, false), data.all);
            });
        });
    });

    describe("#short()", () => {
        const testData: { input: string, length: number, output: string }[] = [
            { input: "", length: 1, output: "" },
            { input: "a", length: 1, output: "a" },
            { input: "a", length: 2, output: "a" },
            { input: "a123", length: 2, output: "a1" },
            { input: "a123", length: 4, output: "a123" },
            { input: "a123", length: 5, output: "a123" },
        ];
        testData.forEach((data) => {
            it(`Short "${data.input}" to length "${data.length}"`, () => {
                chai.assert.equal(NamingRules.short(data.input, data.length), data.output);
            });
        });

        const errorData: { input: string, length: number }[] = [
            { input: "", length: 0 },
            { input: "a", length: 0 },
            { input: "a123", length: 0 },
            { input: "a123", length: -1 },
            { input: "", length: -1 },
        ];
        errorData.forEach((data) => {
            it(`Short "${data.input}" to empty.`, () => {
                chai.expect(() => NamingRules.short(data.input, data.length)).throw();
            });
        });
    });
});