using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.TeamsFxSimpleAuth.Exceptions;
using Microsoft.Extensions.Logging;
using System.Web;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using System.Net;

namespace Microsoft.TeamsFxSimpleAuth
{
    public class SimpleAuthExceptionFilter : ExceptionFilterAttribute
    {
        private ILogger<SimpleAuthExceptionFilter> _logger;
        private ProblemDetailsFactory _problemDetailsFactory;
        private const string ProblemTypeUriPrefix = "";
        private const string UnhandledExceptionProblemType = ProblemTypeUriPrefix + "UnhandledException";
        private const string UnhandledErrorHandlingExceptionProblemType = ProblemTypeUriPrefix + "UnhandledErrorHandlingException";

        public SimpleAuthExceptionFilter(ILogger<SimpleAuthExceptionFilter> logger, ProblemDetailsFactory problemDetailsFactory)
        {
            _logger = logger;
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
