import { HttpRequest, InvocationContext } from "@azure/functions";
import { CloudType, TokenValidator, getEntraJwksUri } from "jwt-validate";
import config from "./config";

async function validateToken(token: string): Promise<any> {
  // gets the JWKS URL for the Microsoft Entra common tenant
  const entraJwksUri = await getEntraJwksUri(config.tenantId, CloudType.Public);

  // create a new token validator with the JWKS URL
  const validator = new TokenValidator({ jwksUri: entraJwksUri });

  // define validation options
  const options = {
    allowedTenants: [config.tenantId],
    audience: "91ebdfd7-4923-4363-9bee-dfc2dd6d8107",
    // audience: config.clientId,
    issuer: `https://login.microsoftonline.com/${config.tenantId}/v2.0`,
    scp: ["repairs_read"],
    idtpy: "JWT",
    ver: "2.0",
  };

  // validate the token
  const validToken = await validator.validateToken(token, options);

  // Token is valid
  return validToken;
}

/**
 * Middleware function for handling JWT authorization.
 *
 * @param {HttpRequest} req - The HTTP request.
 * @param {InvocationContext} context - The Azure Functions context object.
 * @returns {Promise<{ authorized: boolean, error?: string }>} - Returns an object containing a boolean indicating authorization success and an optional error message.
 */
export async function authMiddleware(
  req: HttpRequest,
  context: InvocationContext
): Promise<{ authorized: boolean; error?: string }> {
  // Get the token from the request headers
  const token = req.headers.get("authorization")?.split(" ")[1];

  if (!token) {
    context.log("Unauthorized: No token provided");
    return {
      authorized: false,
      error: "No token provided",
    };
  }

  try {
    // Validate the token
    const validToken = await validateToken(token);

    // Authorization successful
    context.log("Token decoded:", validToken);
    return { authorized: true };
  } catch (err) {
    // Handle validation error
    context.log(`Unauthorized: ${err.message}`);
    return {
      authorized: false,
      error: err.message,
    };
  }
}
