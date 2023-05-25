import fs from 'fs-extra';
import path from 'path';
import { CodeResult, ResponseObjectResult } from './interfaces';
import { OpenAPIV3 } from 'openapi-types';
import {
  getResponseJsonResult,
  getSafeCardName,
  capitalizeFirstLetter
} from './utils';

export async function generateApi(
  apis: OpenAPIV3.Document
): Promise<CodeResult[]> {
  const sampleResponse: ResponseObjectResult[] = await generateResponseObject(
    apis
  );
  const result: CodeResult[] = [];
  const apiFunctionsByTag: Record<string, string[]> = {};
  const emptyFunctionsByTag: Record<string, string[]> = {};
  for (const sampleJsonResult of sampleResponse) {
    const jsonString = JSON.stringify(sampleJsonResult.content, null, 2);
    const tag = sampleJsonResult.tag;
    const apiFuncTemplate = await fs.readFile(
      path.join(__dirname, './resources/apiFuncTemplate.txt'),
      'utf-8'
    );
    const mockApiFunction = apiFuncTemplate
      .replace('{{functionName}}', sampleJsonResult.name)
      .replace('{{returnJsonObject}}', `return ${jsonString};`);
    const emptyApiFunction = apiFuncTemplate
      .replace('{{functionName}}', sampleJsonResult.name)
      .replace('{{returnJsonObject}}', '');
    if (!apiFunctionsByTag[tag]) {
      apiFunctionsByTag[tag] = [];
    }
    apiFunctionsByTag[tag].push(mockApiFunction);

    if (!emptyFunctionsByTag[tag]) {
      emptyFunctionsByTag[tag] = [];
    }
    emptyFunctionsByTag[tag].push(emptyApiFunction);
  }

  let realApiProviderCode =
    '// Update this code to call real backend service\n';
  let mockApiProviderCode = '';
  for (const tag in apiFunctionsByTag) {
    const apiClassTemplate = await fs.readFile(
      path.join(__dirname, './resources/apiClassTemplate.txt'),
      'utf-8'
    );
    const mockApiClass = apiClassTemplate
      .replace('{{className}}', capitalizeFirstLetter(tag) + 'Api')
      .replace('{{apiList}}', apiFunctionsByTag[tag].join('\n'));

    const realApiClass = apiClassTemplate
      .replace('{{className}}', capitalizeFirstLetter(tag) + 'Api')
      .replace('{{apiList}}', emptyFunctionsByTag[tag].join('\n'));
    mockApiProviderCode += mockApiClass + '\n';
    realApiProviderCode += realApiClass + '\n';
  }

  result.push({ code: mockApiProviderCode, name: 'mockApiProvider' });
  result.push({ code: realApiProviderCode, name: 'realApiProvider' });

  return result;
}

async function generateResponseObject(
  apis: OpenAPIV3.Document
): Promise<ResponseObjectResult[]> {
  const result: ResponseObjectResult[] = [];
  for (const url in apis.paths) {
    for (const operation in apis.paths[url]) {
      if (operation === 'get') {
        try {
          const sampleResponseJson = parseResponse(
            apis.paths[url]![operation]!,
            url,
            operation
          );
          result.push(sampleResponseJson);
        } catch (error) {
          console.error(
            `\tfailed to generate sample response for ${operation} ${url} due to error: ${(
              error as Error
            ).toString()}\n`
          );
          throw error;
        }
      }
    }
  }
  return result;
}

function parseResponse(
  api: OpenAPIV3.OperationObject,
  url: string,
  operation: string
): ResponseObjectResult {
  const jsonResult = getResponseJsonResult(api);

  let responseSampleObject = {};

  if (jsonResult.schema) {
    responseSampleObject = generateResponse(
      jsonResult.schema as OpenAPIV3.SchemaObject
    );
  } else if (jsonResult.examples) {
    responseSampleObject = JSON.stringify(jsonResult.examples, null, 2);
  } else {
    responseSampleObject = {};
  }

  return {
    name: getSafeCardName(api, url, operation),
    url,
    operation,
    tag: api.tags ? api.tags[0] : 'default',
    content: responseSampleObject
  };
}

function generateResponse(schema: OpenAPIV3.SchemaObject): any {
  if (schema.type === 'array') {
    const root = [];
    root.push(generateResponse(schema.items as OpenAPIV3.SchemaObject));
    return root;
  }

  if (schema.type === 'object' || (!schema.type && schema.properties)) {
    const { properties } = schema;
    const root = {} as any;
    for (const property in properties) {
      root[property] = generateResponse(
        properties[property] as OpenAPIV3.SchemaObject
      );
    }
    return root;
  }

  if (
    schema.type === 'string' ||
    schema.type === 'integer' ||
    schema.type === 'boolean' ||
    schema.type === 'number'
  ) {
    if (schema.example) {
      return schema.example;
    }

    switch (schema.type) {
      case 'string':
        if (schema.enum) {
          return schema.enum[0];
        }
        return 'value';
      case 'integer':
        return 1;
      case 'boolean':
        return true;
      case 'number':
        return 1.0;
    }
  }
  if (schema.allOf) {
    let result = {};
    for (let i = 0; i < schema.allOf.length; i++) {
      const obj = generateResponse(schema.allOf[i] as OpenAPIV3.SchemaObject);
      result = Object.assign(result, obj);
    }
    return result;
  }

  if (schema.oneOf || schema.anyOf || schema.not) {
    throw new Error(
      `oneOf, anyOf, and not schema is not supported: ${JSON.stringify(schema)}`
    );
  }

  throw new Error(`Unknown schema:${JSON.stringify(schema)}`);
}
