// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OpenAPIV3 } from "openapi-types";

export interface OptimizerOptions {
  removeUnusedComponents: boolean;
  removeUnusedTags: boolean;
  removeUserDefinedRootProperty: boolean;
  removeUnusedSecuritySchemas: boolean;
}

export class SpecOptimizer {
  private static defaultOptions: OptimizerOptions = {
    removeUnusedComponents: true,
    removeUnusedTags: true,
    removeUserDefinedRootProperty: true,
    removeUnusedSecuritySchemas: true,
  };

  static optimize(spec: OpenAPIV3.Document, options?: OptimizerOptions): OpenAPIV3.Document {
    const mergedOptions = {
      ...SpecOptimizer.defaultOptions,
      ...(options ?? {}),
    } as Required<OptimizerOptions>;

    const newSpec = JSON.parse(JSON.stringify(spec));

    if (mergedOptions.removeUserDefinedRootProperty) {
      SpecOptimizer.removeUserDefinedRootProperty(newSpec);
    }

    if (mergedOptions.removeUnusedComponents) {
      SpecOptimizer.removeUnusedComponents(newSpec);
    }

    if (mergedOptions.removeUnusedTags) {
      SpecOptimizer.removeUnusedTags(newSpec);
    }

    if (mergedOptions.removeUnusedSecuritySchemas) {
      SpecOptimizer.removeUnusedSecuritySchemas(newSpec);
    }

    return newSpec;
  }

  private static removeUnusedSecuritySchemas(spec: OpenAPIV3.Document): void {
    if (!spec.components || !spec.components.securitySchemes) {
      return;
    }

    const usedSecuritySchemas = new Set<string>();

    for (const pathKey in spec.paths) {
      for (const methodKey in spec.paths[pathKey]) {
        const operation: OpenAPIV3.OperationObject = (spec.paths[pathKey] as any)[methodKey];
        if (operation.security) {
          operation.security.forEach((securityReq) => {
            for (const schemaKey in securityReq) {
              usedSecuritySchemas.add(schemaKey);
            }
          });
        }
      }
    }

    if (spec.security) {
      spec.security.forEach((securityReq) => {
        for (const schemaKey in securityReq) {
          usedSecuritySchemas.add(schemaKey);
        }
      });
    }

    for (const schemaKey in spec.components.securitySchemes) {
      if (!usedSecuritySchemas.has(schemaKey)) {
        delete spec.components.securitySchemes[schemaKey];
      }
    }

    if (Object.keys(spec.components.securitySchemes).length === 0) {
      delete spec.components.securitySchemes;
    }

    if (Object.keys(spec.components).length === 0) {
      delete spec.components;
    }
  }

  private static removeUnusedTags(spec: OpenAPIV3.Document): void {
    if (!spec.tags) {
      return;
    }

    const usedTags = new Set<string>();

    for (const pathKey in spec.paths) {
      for (const methodKey in spec.paths[pathKey]) {
        const operation: OpenAPIV3.OperationObject = (spec.paths[pathKey] as any)[methodKey];
        if (operation.tags) {
          operation.tags.forEach((tag) => usedTags.add(tag));
        }
      }
    }

    spec.tags = spec.tags.filter((tagObj) => usedTags.has(tagObj.name));
  }

  private static removeUserDefinedRootProperty(spec: OpenAPIV3.Document): void {
    for (const key in spec) {
      if (key.startsWith("x-")) {
        delete (spec as any)[key];
      }
    }
  }

  private static removeUnusedComponents(spec: OpenAPIV3.Document): void {
    const components = spec.components;
    if (!components) {
      return;
    }

    delete spec.components;

    const usedComponentsSet = new Set<string>();

    const specString = JSON.stringify(spec);
    const componentReferences = SpecOptimizer.getComponentReferences(specString);

    for (const reference of componentReferences) {
      this.addComponent(reference, usedComponentsSet, components);
    }

    const newComponents: any = {};

    for (const componentName of usedComponentsSet) {
      const parts = componentName.split("/");
      const component = this.getComponent(componentName, components);
      if (component) {
        let current = newComponents;
        for (let i = 2; i < parts.length; i++) {
          if (i === parts.length - 1) {
            current[parts[i]] = component;
          } else if (!current[parts[i]]) {
            current[parts[i]] = {};
          }
          current = current[parts[i]];
        }
      }
    }

    // securitySchemes are referenced directly by name, to void issue, just keep them all and use removeUnusedSecuritySchemas to remove unused ones
    if (components.securitySchemes) {
      newComponents.securitySchemes = components.securitySchemes;
    }

    if (Object.keys(newComponents).length !== 0) {
      spec.components = newComponents;
    }
  }

  private static getComponentReferences(specString: string): string[] {
    const matches = Array.from(specString.matchAll(/['"](#\/components\/.+?)['"]/g));
    const matchResult = matches.map((match) => match[1]);
    return matchResult;
  }

  private static getComponent(componentPath: string, components: OpenAPIV3.ComponentsObject): any {
    const parts = componentPath.split("/");
    let current: any = components;

    for (const part of parts) {
      if (part === "#" || part === "components") {
        continue;
      }
      current = current[part];
      if (!current) {
        return null;
      }
    }

    return current;
  }

  private static addComponent(
    componentName: string,
    usedComponentsSet: Set<string>,
    components: OpenAPIV3.ComponentsObject
  ) {
    if (usedComponentsSet.has(componentName)) {
      return;
    }
    usedComponentsSet.add(componentName);

    const component = this.getComponent(componentName, components);
    if (component) {
      const componentString = JSON.stringify(component);
      const componentReferences = SpecOptimizer.getComponentReferences(componentString);
      for (const reference of componentReferences) {
        this.addComponent(reference, usedComponentsSet, components);
      }
    }
  }
}
