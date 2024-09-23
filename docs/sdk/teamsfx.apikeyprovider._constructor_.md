<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@microsoft/teamsfx](./teamsfx.md) &gt; [ApiKeyProvider](./teamsfx.apikeyprovider.md) &gt; [(constructor)](./teamsfx.apikeyprovider._constructor_.md)

## ApiKeyProvider.(constructor)

Constructs a new instance of the `ApiKeyProvider` class

<b>Signature:</b>

```typescript
constructor(keyName: string, keyValue: string, keyLocation: ApiKeyLocation);
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  keyName | string | The name of request header or query parameter that specifies API Key |
|  keyValue | string | The value of API Key |
|  keyLocation | [ApiKeyLocation](./teamsfx.apikeylocation.md) | The location of API Key: request header or query parameter. |

## Exceptions

[InvalidParameter](./teamsfx.errorcode.md) - when key name or key value is empty.

[RuntimeNotSupported](./teamsfx.errorcode.md) when runtime is browser.
