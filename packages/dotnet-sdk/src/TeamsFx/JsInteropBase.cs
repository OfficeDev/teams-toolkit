// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.JSInterop;
using System;
using System.Threading.Tasks;

namespace Microsoft.TeamsFx
{
    public abstract class JsInteropBase : IAsyncDisposable
    {
        protected readonly Lazy<Task<IJSObjectReference>> moduleTask;

        public JsInteropBase(IJSRuntime jsRuntime)
        {
            moduleTask = new(() => jsRuntime.InvokeAsync<IJSObjectReference>(
               "import", "./_content/Microsoft.TeamsFx/jsInterop.js").AsTask());
        }

        public async ValueTask DisposeAsync()
        {
            if (moduleTask.IsValueCreated)
            {
                var module = await moduleTask.Value.ConfigureAwait(false);
                await module.DisposeAsync().ConfigureAwait(false);
            }
        }
    }
}
