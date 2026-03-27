# Authentication API Documentation

This Django project has been secured with JWT (JSON Web Tokens) generated using `djangorestframework-simplejwt`. By default, all `/api/*` endpoints (except authentication and schema generation) require a valid JWT token.

## Table of Contents

- [User Registration](#user-registration)
- [Login (Obtain Token)](#login-obtain-token)
- [Refresh Token](#refresh-token)
- [Verify Token](#verify-token)
- [Authenticating Your Requests](#authenticating-your-requests)

---

### 1. User Registration

**Endpoint:** `POST /api/register/`  
**Description:** Create a new user account.

**Request Body (JSON):**

```json
{
  "username": "johndoe",
  "password": "securepassword123",
  "email": "johndoe@example.com",
  "first_name": "John",
  "last_name": "Doe"
}
```

_Note: `username` and `password` are required. Other fields are optional._

---

### 2. Login (Obtain Token)

**Endpoint:** `POST /api/token/`  
**Description:** Submit your credentials to get your Access and Refresh tokens.

**Request Body (JSON):**

```json
{
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Response (200 OK):**

```json
{
  "refresh": "eyJhbG... (long string)",
  "access": "eyJhbG... (long string)"
}
```

_Note: The access token expires in 1 day, while the refresh token is valid for 7 days._

---

### 3. Refresh Token

**Endpoint:** `POST /api/token/refresh/`  
**Description:** Obtain a new access token when the current one expires, using your active refresh token.

**Request Body (JSON):**

```json
{
  "refresh": "eyJhbG... (your previous refresh token)"
}
```

**Response (200 OK):**

```json
{
  "access": "eyJhbG... (new access token)",
  "refresh": "eyJhbG... (new refresh token)"
}
```

_Note: `ROTATE_REFRESH_TOKENS` is enabled. You will receive a new refresh token every time you refresh._

---

### 4. Verify Token

**Endpoint:** `POST /api/token/verify/`  
**Description:** Check if a given token is still valid.

**Request Body (JSON):**

```json
{
  "token": "eyJhbG... (access or refresh token)"
}
```

**Response:**

- `200 OK` (Empty object `{}`) if the token is valid.
- `401 Unauthorized` if the token is invalid or expired.

---

### 5. Authenticating Your Requests

Once you have the `access` token, include it in the `Authorization` header of all subsequent HTTP requests to protected endpoints.

**Format:**

```http
Authorization: Bearer <your_access_token>
```

**Example (cURL):**

```bash
curl -X GET http://localhost:8000/api/patients/ \
     -H "Authorization: Bearer eyJhbG..."
```

_(Optional) If you are testing endpoints directly on the Swagger UI (`/api/docs/`), simply click the **Authorize** button at the top right, type the token (e.g., `Bearer <token_here>`), and make your requests._
