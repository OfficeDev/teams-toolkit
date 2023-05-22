import { OpenAPIV3 } from 'openapi-types';
import { AdaptiveCardResult } from './interfaces';
import {
  getCardTitle,
  getResponseJsonResult,
  getSafeCardName,
  wrapperCard
} from './utils';
import tableElement from './resources/tableElement.json';

export async function generateResponseCard(
  apis: OpenAPIV3.Document
): Promise<AdaptiveCardResult[]> {
  console.log('Generate adaptive cards');
  const result: AdaptiveCardResult[] = [];
  for (const url in apis.paths) {
    for (const operation in apis.paths[url]) {
      if (operation === 'get') {
        console.log(`API: ${operation} ${url}`);
        try {
          const card = parseResponse(
            apis.paths[url]![operation]!,
            url,
            operation
          );
          result.push(card);
          console.log(`\tsuccessfully generated response card for this api\n`);
        } catch (error) {
          console.error(
            `\tfailed to generate response card for ${operation} ${url} due to error: ${(
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
): AdaptiveCardResult {
  const jsonResult = getResponseJsonResult(api);

  let cardBody;

  if (jsonResult.schema) {
    cardBody = generateCardFromResponse(
      jsonResult.schema as OpenAPIV3.SchemaObject,
      ''
    );
  } else if (jsonResult.examples) {
    cardBody = [
      {
        type: 'TextBlock',
        text: '${$root}',
        wrap: true
      }
    ];
  } else {
    cardBody = [
      {
        type: 'TextBlock',
        text: 'success',
        wrap: true
      }
    ];
  }

  const cardTitle = getCardTitle(operation, url, api.summary);

  cardBody.unshift(cardTitle);

  const card = wrapperCard(cardBody, '');

  const adaptiveCardName = getSafeCardName(api, url, operation);

  return {
    tag: api.tags ? api.tags[0] : 'default',
    id: adaptiveCardName,
    name: adaptiveCardName + 'ResponseCard',
    content: card,
    url,
    operation,
    isArray: (jsonResult.schema as OpenAPIV3.SchemaObject)?.type === 'array'
  };
}

function generateCardFromResponse(
  schema: OpenAPIV3.SchemaObject,
  name: string,
  insideArr = false,
  parentName = ''
): any {
  if (schema.type === 'array') {
    const obj = generateCardFromResponse(
      schema.items as OpenAPIV3.SchemaObject,
      '',
      true,
      name
    );
    const template = JSON.parse(JSON.stringify(tableElement));
    template[0].rows[0].$data = name ? `\${${name}}` : '${$root}';
    template[0].rows[0].cells[0].items.push(...obj);
    return template;
  }
  if (schema.type === 'object' || (!schema.type && schema.properties)) {
    // some schema may not contain type but contain properties
    const { properties } = schema;
    const result = [];
    for (const property in properties) {
      const obj = generateCardFromResponse(
        properties[property] as OpenAPIV3.SchemaObject,
        name ? `${name}.${property}` : property,
        insideArr,
        parentName || name
      );
      result.push(...obj);
    }

    if (schema.additionalProperties) {
      console.warn(
        'additionalProperties is not supported, and will be ignored'
      );
    }

    return result;
  }
  if (
    schema.type === 'string' ||
    schema.type === 'integer' ||
    schema.type === 'boolean' ||
    schema.type === 'number'
  ) {
    let text = 'result: ${$root}';

    if (!name) {
      if (!insideArr) {
        return [
          {
            type: 'TextBlock',
            text,
            wrap: true
          }
        ];
      }
      text = parentName ? `${parentName}: ` + '${$data}' : '${$data}';
    } else {
      text = `${name}: \${${name}}`;

      if (parentName && insideArr) {
        text = `${parentName}.${text}`;
      }
    }

    return [
      {
        type: 'TextBlock',
        text,
        wrap: true
      }
    ];
  }
  if (schema.allOf) {
    const result = [];
    for (let i = 0; i < schema.allOf.length; i++) {
      result.push(
        ...generateCardFromResponse(
          schema.allOf[i] as OpenAPIV3.SchemaObject,
          name,
          insideArr,
          parentName
        )
      );
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
