using System;
using System.Net;

namespace Microsoft.TeamsFxSimpleAuth.Exceptions
{
    // Error handler will set http status code to Status property for child classes of ApiExceptionBase
    // Name of the child class will be used as problem type and return to client as part of error response
    // Use ProblemType attribute to define customized problem type string: [ProblemType("GeneralException")]
    // NOTE: The problem type should not be changed in one API version
    public abstract class ApiExceptionBase : Exception
    {
        public HttpStatusCode Status { get; set; } // The status code of http error response

        public ApiExceptionBase(HttpStatusCode statusCode)
            : base()
        {
            internalInit(statusCode);
        }

        public ApiExceptionBase(string message, HttpStatusCode statusCode)
            : base(message)
        {
            internalInit(statusCode);
        }

        public ApiExceptionBase(string message, Exception innerException, HttpStatusCode statusCode)
            : base(message, innerException)
        {
            internalInit(statusCode);
        }

        private void internalInit(HttpStatusCode statusCode)
        {
            Status = statusCode;
        }
    }
}
