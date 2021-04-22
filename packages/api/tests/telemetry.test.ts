// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import "mocha";
import chai from "chai";
import spies from "chai-spies";
import {TelemetryReporter, PluginTelemetryReporter} from "../src/utils/telemetry";

chai.use(spies);
const expect = chai.expect;

const pluginName = "The way that can be told of is not an unvarying way";
const sandbox = chai.spy.sandbox();

class MockTelemetryReporter implements TelemetryReporter {
    sendTelemetryErrorEvent({}: string, {}: {[p: string]: string;}, {}: {[p: string]: number;}, {}: string[]): void {
        // do nothing
    }

    sendTelemetryEvent({}: string, {}: {[p: string]: string;}, {}: {[p: string]: number;}): void {
        // do nothing
    }

    sendTelemetryException({}: Error, {}: {[p: string]: string;}, {}: {[p: string]: number;}): void {
        // do nothing
    }
}

describe("telemetry", () => {
    let reporter: TelemetryReporter;
    let proxy: TelemetryReporter;

    beforeEach(() => {
        reporter = new MockTelemetryReporter();
        sandbox.on(reporter, ["sendTelemetryErrorEvent", "sendTelemetryEvent", "sendTelemetryException"]);
        proxy = new PluginTelemetryReporter(reporter, pluginName);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("sendTelemetryEvent", () => {
        proxy.sendTelemetryEvent("sampleEvent", {"stringProp": "some string"}, {"numericMeasure": 123});

        expect(reporter.sendTelemetryEvent)
            .to.have.been.called
            .with(
                pluginName + "-" + "sampleEvent",
                {"stringProp": "some string", "pluginName": pluginName},
                {"numericMeasure": 123}
            );
    });

    it("sendTelemetryErrorEvent", () => {
        proxy.sendTelemetryErrorEvent("sampleErrorEvent", {
            "stringProp": "some string",
            "stackProp": "some user stack trace"
        }, {"numericMeasure": 123}, ["stackProp"]);

        expect(reporter.sendTelemetryErrorEvent)
            .to.have.been.called
            .with(
                pluginName + "-" + "sampleErrorEvent",
                {
                    "stringProp": "some string",
                    "pluginName": pluginName,
                    "stackProp": "some user stack trace"
                },
                {"numericMeasure": 123},
                ["stackProp"]
            );
    });

    it("sendTelemetryException", () => {
        const error = new Error("error for test");
        proxy.sendTelemetryException(error, {"stringProp": "some string"}, {"numericMeasure": 123});

        expect(reporter.sendTelemetryException)
            .to.have.been.called
            .with(
                error,
                {"stringProp": "some string", "pluginName": pluginName},
                {"numericMeasure": 123}
            );
    });

    it("invoke times", () => {
        proxy.sendTelemetryEvent("sampleEvent", {"stringProp": "some string"}, {"numericMeasure": 123});

        expect(reporter.sendTelemetryEvent)
            .to.have.been.called.once;
    });
});
