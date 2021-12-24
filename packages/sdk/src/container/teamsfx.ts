// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Component, ComponentContainer, Mapping } from "./types";

export class TeamsFx<T extends Component> implements ComponentContainer {
  private registry: Map<string, Component>;
  private initialized: Map<string, boolean>;

  constructor(components: T[]) {
    this.registry = new Map<string, Component>();
    this.initialized = new Map<string, boolean>();

    for (const component of components) {
      this.addComponent(component);
    }
  }

  private addComponent(component: T): void {
    this.registry.set(component.name, component);

    const functionKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(component));
    console.log("!!!" + functionKeys);
    functionKeys.forEach((key: string) => {
      console.log(`found ${key} in component ${component.name}`);
      const method = component[key];
      if (
        method instanceof Function &&
        key !== "constructor" &&
        key !== "initialize" &&
        !key.startsWith("_")
      ) {
        // const isAsync = method.constructor.name === "AsyncFunction";
        (this as Mapping)[key] = (...args: any) => {
          const instance = this.resolve(component.name);
          return method.call(instance, ...args);
        };
      }
    });
  }

  resolve(componentName: string): unknown {
    const component = this.registry.get(componentName);
    if (!component) {
      throw new Error();
    }
    if (!this.initialized.get(componentName)) {
      component.initialize(this);
      this.initialized.set(componentName, true);
    }
    return component;
  }
}

export function createTeamsFx<T, P extends Component = Component>(components: P[]): T {
  return new TeamsFx<P>(components) as unknown as T;
}
