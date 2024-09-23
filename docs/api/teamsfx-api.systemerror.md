<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@microsoft/teamsfx-api](./teamsfx-api.md) &gt; [SystemError](./teamsfx-api.systemerror.md)

## SystemError class

Users cannot handle it by themselves.

<b>Signature:</b>

```typescript
export declare class SystemError extends Error implements FxError 
```
<b>Extends:</b> Error

<b>Implements:</b> [FxError](./teamsfx-api.fxerror.md)

## Constructors

|  Constructor | Modifiers | Description |
|  --- | --- | --- |
|  [(constructor)(error, source, name, issueLink)](./teamsfx-api.systemerror._constructor_.md) |  | Constructs a new instance of the <code>SystemError</code> class |
|  [(constructor)(opt)](./teamsfx-api.systemerror._constructor__1.md) |  | Constructs a new instance of the <code>SystemError</code> class |
|  [(constructor)(name, message, source, stack, issueLink, innerError)](./teamsfx-api.systemerror._constructor__2.md) |  | Constructs a new instance of the <code>SystemError</code> class |

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [innerError?](./teamsfx-api.systemerror.innererror.md) |  | any | <i>(Optional)</i> Custom error details. |
|  [issueLink?](./teamsfx-api.systemerror.issuelink.md) |  | string | <i>(Optional)</i> A github issue page where users can submit a new issue. |
|  [source](./teamsfx-api.systemerror.source.md) |  | string | Source name of error. (plugin name, eg: tab-scaffold-plugin) |
|  [timestamp](./teamsfx-api.systemerror.timestamp.md) |  | Date | Time of error. |
|  [userData?](./teamsfx-api.systemerror.userdata.md) |  | string | <i>(Optional)</i> data that only be reported to github issue manually by user and will not be reported as telemetry data |
