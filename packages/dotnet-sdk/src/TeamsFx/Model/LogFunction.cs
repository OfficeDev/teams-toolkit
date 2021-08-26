// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.JSInterop;

namespace Microsoft.TeamsFx.Model
{
    public delegate void LogFunction(LogLevel logLevel, string message);

    internal class LogFunctionCallback
    {
        public LogFunction CustomLogFunction { get; set; }

        [JSInvokable]
        public void Invoke(LogLevel logLevel, string message)
        {
            CustomLogFunction(logLevel, message);
        }
    }
}
