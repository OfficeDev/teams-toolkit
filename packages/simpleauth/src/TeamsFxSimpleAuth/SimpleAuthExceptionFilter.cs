// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.TeamsFx.SimpleAuth.Exceptions;
using System;
using System.Collections.Generic;
using System.Net;
using System.Web;

namespace Microsoft.TeamsFx.SimpleAuth
{
    public class SimpleAuthExceptionFilter : ExceptionFilterAttribute
    {
        private ILogger<SimpleAuthExceptionFilter> _logger;
        private bool _isDevelopment;
        private const string ProblemTypeUriPrefix = "";
        private const string UnhandledExceptionProblemType = ProblemTypeUriPrefix + "UnhandledException";
        private const string UnhandledErrorHandlingExceptionProblemType = ProblemTypeUriPrefix + "UnhandledErrorHandlingException";

        public SimpleAuthExceptionFilter(ILogger<SimpleAuthExceptionFilter> logger, IWebHostEnvironment env)
        {
            _logger = logger;
            _isDevelopment = env.IsDevelopment();
        }

        public override void OnException(ExceptionContext context)
        {
            try
            {
                context.ExceptionHandled = true;
                if (context.Exception is ApiExceptionBase exception)
                {
                    // Set http status code according to Status property in ApiExceptionBase
                    var exceptionType = exception.GetType();
                    var attribute = (ProblemTypeAttribute)Attribute.GetCustomAttribute(exception.GetType(), typeof(ProblemTypeAttribute));
                    string problemType;
                    if (attribute != null)
                    {
                        problemType = attribute.ProblemType;
                    }
                    else
                    {
                        problemType = exceptionType.Name;
                    }
                    problemType = ProblemTypeUriPrefix + HttpUtility.UrlEncode(problemType);
                    _logger.LogDebug($"Met problem {problemType} when processing request: {exception}");
                    var problemDetails = new ProblemDetails
                    {
                        Type = problemType,
                        Status = (int)exception.Status,
                        Detail = exception.Message
                    };

                    if(_isDevelopment)
                    {
                        problemDetails.Extensions.TryAdd("Exception", exception.ToString());
                    }

                    context.Result = new ObjectResult(problemDetails)
                    {
                        StatusCode = problemDetails.Status
                    };
                    
                }
                else
                {
                    // Return internal server error for non ApiExceptionBase exceptions
                    _logger.LogError($"Unhandled exception when processing request: {context.Exception}");
                    var problemDetails = new ProblemDetails
                    {
                        Type = UnhandledExceptionProblemType,
                        Status = (int)HttpStatusCode.InternalServerError,
                        Detail = context.Exception.Message
                    };

                    if (_isDevelopment)
                    {
                        problemDetails.Extensions.TryAdd("Exception", context.Exception.ToString());
                    }

                    context.Result = new ObjectResult(problemDetails)
                    {
                        StatusCode = problemDetails.Status
                    };
                }
            }
            catch (Exception e)
            {
                _logger.LogDebug($"Unhandled exception in SimpleAuthExceptionFilter: {e}");
                var problemDetails = new ProblemDetails
                {
                    Type = UnhandledErrorHandlingExceptionProblemType,
                    Status = (int)HttpStatusCode.InternalServerError,
                    Detail = e.Message
                };
                context.Result = new ObjectResult(problemDetails)
                {
                    StatusCode = problemDetails.Status
                };
            }
        }
    }
}
