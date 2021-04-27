// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import "mocha";
import {assert} from "chai";
import {LogProvider, LogLevel} from "../src/utils/log";

class TestLogProvider implements LogProvider {
    async trace({}: string): Promise<boolean> {
        return true;
    }
    async debug({}: string): Promise<boolean> {
        return true;
    }
    async info({}: string): Promise<boolean> {
        return true;
    }
    async warning({}: string): Promise<boolean> {
        return true;
    }
    async error({}: string): Promise<boolean> {
        return true;
    }
    async fatal({}: string): Promise<boolean> {
        return true;
    }
    async log({}: LogLevel, {}: string): Promise<boolean> {
        return true;
    }
}

class TestLogProvider2 implements LogProvider {
    async trace({}: string): Promise<boolean> {
        return false;
    }
    async debug({}: string): Promise<boolean> {
        return false;
    }
    async info({}: string): Promise<boolean> {
        return false;
    }
    async warning({}: string): Promise<boolean> {
        return false;
    }
    async error({}: string): Promise<boolean> {
        return false;
    }
    async fatal({}: string): Promise<boolean> {
        return false;
    }
    async log({}: LogLevel, {}: string): Promise<boolean> {
        return false;
    }
}

describe("log", function () {
    describe("logProvider", function () {
        it("happy path", async () => {
            const logProvider = new TestLogProvider();
            const logResult = await logProvider.log(LogLevel.Debug, "123");
            assert.equal(true, logResult);
            const traceResult = await logProvider.trace("123");
            assert.equal(true, traceResult);
            const debugResult = await logProvider.debug("123");
            assert.equal(true, debugResult);
            const infoResult = await logProvider.info("123");
            assert.equal(true, infoResult);
            const warningResult = await logProvider.warning("123");
            assert.equal(true, warningResult);
            const errorResult = await logProvider.error("123");
            assert.equal(true, errorResult);
            const criticalResult = await logProvider.fatal("123");
            assert.equal(true, criticalResult);
        }),
            it("sad path", async () => {
                const logProvider = new TestLogProvider2();
                const logResult = await logProvider.log(LogLevel.Debug, "123");
                assert.equal(false, logResult);
                const traceResult = await logProvider.trace("123");
                assert.equal(false, traceResult);
                const debugResult = await logProvider.debug("123");
                assert.equal(false, debugResult);
                const infoResult = await logProvider.info("123");
                assert.equal(false, infoResult);
                const warningResult = await logProvider.warning("123");
                assert.equal(false, warningResult);
                const errorResult = await logProvider.error("123");
                assert.equal(false, errorResult);
                const criticalResult = await logProvider.fatal("123");
                assert.equal(false, criticalResult);
            });
    });
});
