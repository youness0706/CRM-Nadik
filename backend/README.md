# Nadik Backend

Nadik is a multi-tenant SaaS backend for Moroccan sports associations (martial arts clubs). 
It has been refactored into an API-first architecture using Django REST Framework (DRF) and JWT authentication, while maintaining legacy template views during the transition.

## Features

- **Multi-tenant Architecture**: Strong data isolation per organization.
- **RESTful API**: Available under `/api/v1/`.
- **Authentication**: JWT-based authentication for modern web and mobile clients.
- **Security**: Environment variable-based secrets, CSRF protection, CORS configurations.
- **Documentation**: Auto-generated OpenAPI (Swagger) documentation.

## Prerequisites

- Python 3.10+
- Database (SQLite for local dev, MySQL/PostgreSQL for production)

## Setup Instructions

1. **Clone the repository and enter the project directory:**
   ```bash
   cd CRM-General
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```

3. **Install dependencies:**
   We have split the requirements for different environments:
   ```bash
   pip install -r requirements/development.txt  # For local development
   # or
   pip install -r requirements/production.txt   # For production
   ```

4. **Environment Variables Configuration:**
   Copy the example environment file and fill in your values:
   ```bash
   cp .env.example .env
   ```
   **Important fields to set in `.env`:**
   - `DJANGO_SECRET_KEY`: Generate a secure random key.
   - `DEBUG`: Set to `True` for dev, `False` for production.
   - `DEVELOPMENT_MODE`: Set to `True` to use local SQLite database.
   - `DATABASE_URL`: Set your production database URL (e.g., `mysql://user:pass@host:port/dbname`).
   - `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`: Set your domains.

5. **Run Database Migrations:**
   ```bash
   python manage.py migrate
   ```

6. **Start the Development Server:**
   ```bash
   python manage.py runserver
   ```

## Project Structure

The project has been restructured to support API-first development:

- `api/`: The new DRF-based API application.
  - `auth/`: JWT authentication and registration endpoints.
  - `common/`: Shared utilities, permissions, and pagination.
- `config/`: Environment-specific settings.
  - `settings/base.py`: Shared configurations.
  - `settings/development.py`: Local dev overrides.
  - `settings/production.py`: Production optimizations and security.
- `crm_back/`: Core Django project configuration.
- `trainers/`: Legacy template-based views and all models.

## API Documentation

Once the server is running, you can access the auto-generated OpenAPI documentation at:

- **Swagger UI**: [http://localhost:8000/api/v1/docs/](http://localhost:8000/api/v1/docs/)
- **ReDoc**: [http://localhost:8000/api/v1/redoc/](http://localhost:8000/api/v1/redoc/)
- **Raw Schema**: [http://localhost:8000/api/v1/schema/](http://localhost:8000/api/v1/schema/)

## Authentication (API)

The API uses **JSON Web Tokens (JWT)** for authentication.

1. **Login** (`POST /api/v1/auth/login/`): Submit `username` and `password` to receive an `access` and `refresh` token.
2. **Include Token**: For subsequent requests, include the access token in the headers:
   ```
   Authorization: Bearer <your_access_token>
   ```
3. **Refresh Token** (`POST /api/v1/auth/refresh/`): Submit your refresh token to get a new access token when it expires.

## Important Note on Security

- **Never commit `.env` to version control.** It contains live database credentials, email passwords, and Cloudinary secrets.
- Always use `require_organization` (legacy) or `IsOrganizationMember` (API) permissions to prevent cross-tenant data leaks (IDOR).