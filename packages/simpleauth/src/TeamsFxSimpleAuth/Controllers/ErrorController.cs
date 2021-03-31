using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.TeamsFxSimpleAuth.Exceptions;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Net;
using System.Web;

namespace Microsoft.TeamsFxSimpleAuth.Controllers
{
    [ApiController]
    public class ErrorController : ControllerBase
    {
        // TODO: provide api doc before public preview
        private const string ProblemTypeUriPrefix = "";
        private const string UnhandledExceptionProblemType = ProblemTypeUriPrefix + "UnhandledException";
        private const string UnhandledErrorHandlingExceptionProblemType = ProblemTypeUriPrefix + "UnhandledErrorHandlingException";
        private ILogger<ErrorController> _logger;

        public ErrorController(ILogger<ErrorController> logger)
        {
            _logger = logger;
        }

        // Used in development environment
        [Route("/.internal/error-local-development")]
        public IActionResult ErrorLocalDevelopment([FromServices] IWebHostEnvironment webHostEnvironment)
        {
            try
            {
                if (webHostEnvironment.EnvironmentName != "Development")
                {
                    throw new InvalidOperationException(
                        "This shouldn't be invoked in non-development environments.");
                }

                var problemDetailsResponse = generateProblemDetailsResponse();

                // Provide full stack trace in development environment
                var exceptionHandlerPathFeature = HttpContext.Features.Get<IExceptionHandlerPathFeature>();
                if (problemDetailsResponse.Value is ProblemDetails problemDetails)
                {
                    problemDetails.Extensions.TryAdd("Exception", exceptionHandlerPathFeature.Error);
                }

                return problemDetailsResponse;
            }
            catch (Exception e)
            {
                _logger.LogDebug($"Unhandled exception in error controller: {e}");
                var errorResponse = Problem(type: UnhandledErrorHandlingExceptionProblemType, statusCode: (int)HttpStatusCode.InternalServerError, detail: e.Message);
                if (errorResponse.Value is ProblemDetails problemDetails)
                {
                    problemDetails.Extensions.TryAdd("Exception", e);
                }
                return errorResponse;
            }
        }

        // Used in non-development environment
        [Route("/.internal/error")]
        public IActionResult Error()
        {
            try
            {
                return generateProblemDetailsResponse();
            }
            catch (Exception e)
            {
                _logger.LogDebug($"Unhandled exception in error controller: {e}");
                return Problem(type: UnhandledErrorHandlingExceptionProblemType, statusCode: (int)HttpStatusCode.InternalServerError, detail: e.Message);
            }
        }

        // Override the Problem() function to set correct status code in response
        public override ObjectResult Problem(string detail = null, string instance = null, int? statusCode = null, string title = null, string type = null)
        {
            var problemDetailResponse = base.Problem(detail, instance, statusCode, title, type);
            problemDetailResponse.StatusCode = statusCode ?? 500;
            return problemDetailResponse;
        }

        private ObjectResult generateProblemDetailsResponse()
        {
            var exceptionHandlerPathFeature = HttpContext.Features.Get<IExceptionHandlerPathFeature>();
            // Temporary solution, need more effort on logging framework
            
            if (exceptionHandlerPathFeature.Error is ApiExceptionBase exception)
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
                _logger.LogDebug($"Met problem {problemType} when processing request to {exceptionHandlerPathFeature.Path}: {exception}");
                var problemDetailResponse = Problem(type: problemType, statusCode: (int)exception.Status, detail: exception.Message);
                return problemDetailResponse;
            }
            else
            {
                // Return internal server error for non ApiExceptionBase exceptions
                _logger.LogError($"Unhandled exception when processing request to {exceptionHandlerPathFeature.Path}: {exceptionHandlerPathFeature.Error}");
                var problemDetailResponse = Problem(type: UnhandledExceptionProblemType, statusCode: (int)HttpStatusCode.InternalServerError, detail: exceptionHandlerPathFeature.Error.Message);
                return problemDetailResponse;
            }
        }
    }
}
