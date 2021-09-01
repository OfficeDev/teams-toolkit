// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.JSInterop;

namespace Microsoft.TeamsFx.Model
{
    /// <summary>
    /// Log function for customized logging.
    /// </summary>
    /// <param name="logLevel">Log level</param>
    /// <param name="message">Log message</param>
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
