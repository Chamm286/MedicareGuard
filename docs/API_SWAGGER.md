# MedicareGuard API — Swagger / OpenAPI

Swagger UI is generated at runtime from every Express route, so the documentation always matches the deployed API.

| Resource | URL |
| --- | --- |
| Swagger UI | http://localhost:4000/api/docs/ |
| OpenAPI JSON | http://localhost:4000/api/openapi.json |
| Route inventory | http://localhost:4000/api/_meta/endpoints |

The spec contains the full route inventory (547 business endpoints), JWT bearer authentication, Vietnamese tag descriptions, pagination/filter parameters, request bodies for write operations and standard error responses.

## Authenticate in Swagger UI

1. Call `POST /api/auth/login` with `admin@medicareguard.io` / `Admin@123`.
2. Copy the `token` value from the response.
3. Click **Authorize** in Swagger UI and paste the token.
4. Call any protected endpoint.

## Regenerate or verify

The spec is built from the live Express router in `backend/src/openapi.js`; there is no static file to maintain. Restart the backend after adding routes and the new endpoint appears automatically.
