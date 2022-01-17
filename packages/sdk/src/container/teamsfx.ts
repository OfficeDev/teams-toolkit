// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { satisfies } from "semver";
import { Component, ComponentApiNames, ComponentContainer, Mapping, TeamsFx } from "./types";
import { Logger, InternalLogger, LogLevel, LogFunction } from "../util/logger";

export class TeamsFxContainer<T extends Component> implements ComponentContainer, TeamsFx {
  private registry: Map<string, Component>;
  private initialized: Map<string, boolean>;
  private loggers: Map<string, InternalLogger>;

  private logLevel?: LogLevel;

  constructor(components: T[]) {
    this.registry = new Map<string, Component>();
    this.initialized = new Map<string, boolean>();
    this.loggers = new Map<string, InternalLogger>();

    for (const component of components) {
      this.addComponent(component);
    }
  }

  private addComponent(component: T): void {
    this.registry.set(component.name, component);
    const logger = new InternalLogger(component.name, this.logLevel);
    this.loggers.set(component.name, logger);

    const functionKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(component));
    functionKeys.forEach((key: string) => {
      const method = component[key];
      if (method instanceof Function && !ComponentApiNames.includes(key) && !key.startsWith("_")) {
        (this as Mapping)[key] = (...args: any) => {
          const instance = this.resolve(component.name);
          return method.call(instance, ...args);
        };
      }
    });
  }

  public resolve(componentName: string): unknown {
    const component = this.registry.get(componentName);
    if (!component) {
      throw new Error(`Component ${componentName} doesn't exist`);
    }
    if (!this.initialized.get(componentName)) {
      const componentLogger = this.loggers.get(componentName);
      component.initialize(this, componentLogger!);
      this.initialized.set(componentName, true);
    }
    return component;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    for (const componentLogger of this.loggers.values()) {
      componentLogger.level = level;
    }
  }

  public getLogLevel(): LogLevel | undefined {
    return this.logLevel;
  }

  public setLogger(logger?: Logger): void {
    for (const componentLogger of this.loggers.values()) {
      componentLogger.customLogger = logger;
    }
  }

  public setLogFunction(logFunction?: LogFunction): void {
    for (const componentLogger of this.loggers.values()) {
      componentLogger.customLogFunction = logFunction;
    }
  }
}

export function createTeamsFx<T, P extends Component = Component>(components: P[]): T & TeamsFx {
  return new TeamsFxContainer<P>(components) as unknown as T & TeamsFx;
}
