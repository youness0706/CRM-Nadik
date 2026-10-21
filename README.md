# Nadik CRM

Nadik is a modern, comprehensive CRM (Customer Relationship Management) system designed specifically for Moroccan gyms, sports clubs, and associations. It provides end-to-end management of members, staff, payments, expenses, events, and financial reporting.

## Architecture

Nadik uses a decoupled architecture with a central API server and multiple client applications:

1.  **Backend (API Server):**
    *   **Framework:** Django + Django REST Framework (DRF)
    *   **Database:** SQLite (development) / PostgreSQL (production recommended)
    *   **Authentication:** JWT (JSON Web Tokens) via `rest_framework_simplejwt`
    *   **Architecture:** Multi-tenant (Organization isolated). The backend is the single source of truth for all business logic, validation, and data.

2.  **Web Client (Frontend):**
    *   **Framework:** React + Vite
    *   **UI Library:** Material UI (MUI) v5
    *   **Design System:** Nadik official theme (Teal/Amber)
    *   **Routing:** React Router v6

3.  **Mobile Client (Future):**
    *   **Framework:** Flutter (consumes the same DRF API)

## Repository Structure

```text
CRM-Nadik/
├── backend/          # Django Backend API & Legacy Templates
│   ├── api/          # DRF API ViewSets, Serializers, and Routing
│   ├── trainers/     # Core Models and Legacy Django Views
│   ├── crm_back/     # Django Settings & WSGI
│   └── manage.py
├── web/              # React Web Client
│   ├── src/
│   │   ├── components/ # Reusable UI (Dialogs, Layouts)
│   │   ├── hooks/      # Custom Hooks (usePagination)
│   │   ├── screens/    # Main Pages (Dashboard, Members, etc.)
│   │   └── services/   # Axios API client & Interceptors
│   ├── .env.development
│   └── package.json
└── mobile/           # Flutter Mobile Application
```

## Setup Instructions

### 1. Backend Setup

Prerequisites: Python 3.10+

```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows: venv\Scripts\activate
# Unix: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations to setup database
python manage.py migrate

# Create a superuser (for admin access)
python manage.py createsuperuser

# Start the development server
python manage.py runserver
```

The API will be available at `http://127.0.0.1:8000/api/v1/`.

### 2. Web Setup

Prerequisites: Node.js 18+

```bash
# Navigate to web directory
cd web

# Install dependencies
npm install

# Start the development server
npm run dev
```

The web app will run on `http://localhost:5173/` and is configured via `.env.development` to communicate with the local Django server.

## Authentication & Security

*   **JWT Tokens:** The frontend securely stores `access_token` and `refresh_token`. The Axios interceptor (`web/src/services/api.js`) automatically refreshes the token in the background when a `401 Unauthorized` response occurs.
*   **Organization Isolation (Multi-tenancy):** Every API endpoint inherits from `BaseOrganizationViewSet`, which strictly filters querysets so users can *only* access data belonging to their specific `Organization`. The organization is derived securely from the authenticated `request.user` on the server, *never* trusted from client input.
*   **Role-Based Access Control (RBAC):** Staff members have roles. Only `is_admin=True` staff can create, edit, or delete other staff members.

## Production Checklist

Before deploying Nadik to production, ensure the following:

- [ ] **Backend `DEBUG`:** Set `DEBUG=False` in the deployment environment.
- [ ] **Allowed Hosts:** Configure `ALLOWED_HOSTS` with production domain.
- [ ] **CORS:** Restrict `CORS_ALLOWED_ORIGINS` to the exact frontend domain (remove `*` or localhost).
- [ ] **Secret Key:** Generate a new, secure `DJANGO_SECRET_KEY`.
- [ ] **Database:** Migrate from SQLite to PostgreSQL.
- [ ] **Static/Media Files:** Vercel serves collected static files; configure Cloudinary for persistent user uploads.
- [ ] **Web Build:** Run `npm run build` and deploy the `web/` project to Vercel.
- [ ] **Web Env:** Set `VITE_API_BASE_URL` to the production HTTPS API.

For the split Vercel deployment, PostgreSQL environment variables, and migration steps, see [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md).

## Testing

Run the automated API test suite to verify Organization Isolation, Auth, and Permissions:
```bash
cd backend
python manage.py test api
```
Run frontend build verification:
```bash
cd web
npm run build
```

## API Documentation

Nadik API documentation is automatically generated. When the backend is running, visit:
*   **Swagger UI:** `/api/v1/docs/`
*   **Redoc:** `/api/v1/redoc/`
*   **OpenAPI Schema:** `/api/v1/schema/`
