// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { LogProvider, UserError } from "@microsoft/teamsfx-api";
import detectPort from "detect-port";

import { CoreSource } from "../../core/error";
import {
  Component,
  sendTelemetryErrorEvent,
  sendTelemetryEvent,
  TelemetryEvent,
} from "../telemetry";

async function detectPortListening(port: number, logger?: LogProvider): Promise<boolean> {
  try {
    sendTelemetryEvent(Component.core, TelemetryEvent.DetectPortStart, { port: port.toString() });
    const race = Promise.race([
      detectPort(port),
      // in case `detectPort` hangs, set 10 seconds timeout
      new Promise<number>((resolve) => setTimeout(() => resolve(port), 10 * 1000)),
    ]);
    const portChosen = await race;
    sendTelemetryEvent(Component.core, TelemetryEvent.DetectPort, {
      portChosen: portChosen.toString(),
      port: port.toString(),
    });
    return portChosen !== port;
  } catch (error: any) {
    // ignore any error to not block debugging
    sendTelemetryErrorEvent(
      Component.core,
      TelemetryEvent.DetectPort,
      new UserError({ error, source: CoreSource, name: "DetectPortError" })
    );
    logger?.warning(`Failed to detect port. ${error?.message as string} `);
    return false;
  }
}

export async function getPortsInUse(ports: number[], logger?: LogProvider): Promise<number[]> {
  const portsInUse: number[] = [];
  for (const port of ports) {
    if (await detectPortListening(port, logger)) {
      portsInUse.push(port);
    }
  }
  return portsInUse;
}
