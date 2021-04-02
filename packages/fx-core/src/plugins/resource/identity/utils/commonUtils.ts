export function formatEndpoint(endpoint: string): string {
    endpoint = endpoint.toLowerCase();
    endpoint = endpoint.replace(/[^a-z0-9-]/gi, "");
    return endpoint;
}