# Deploy Nadik on Vercel with PostgreSQL

Deploy this repository as two Vercel projects. The Django API and Vite web client need different runtimes and separate environment variables.

## 1. Prepare PostgreSQL

Create a managed PostgreSQL database (for example, from a Vercel Marketplace integration or Neon). Copy its pooled connection URL and keep it private. The backend settings accept `DATABASE_URL` or `POSTGRES_URL` and require SSL in production.

## 2. Deploy the Django API

Create a Vercel project connected to this repository with **Root Directory** set to `backend/`. Vercel detects Django from `manage.py`; keep the default install/build settings and do not set a static output directory. Python is pinned to 3.12 in `backend/.python-version`.

Add these variables under the backend project’s Production and Preview environments as appropriate:

| Variable | Value |
| --- | --- |
| `DJANGO_SECRET_KEY` | A newly generated, long random secret; never reuse the example value |
| `DEBUG` | `False` |
| `DEVELOPMENT_MODE` | `False` |
| `DATABASE_URL` | Pooled PostgreSQL URL from your provider (`sslmode=require`) |
| `ALLOWED_HOSTS` | Exact API production hostname, e.g. `nadik-api.vercel.app` |
| `CORS_ALLOWED_ORIGINS` | Exact frontend origin, e.g. `https://nadik-web.vercel.app` |
| `CSRF_TRUSTED_ORIGINS` | Exact frontend origin including `https://` |
| `SECURE_SSL_REDIRECT` | `True` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

Vercel supplies `VERCEL_URL` for each deployment; Django adds that host to `ALLOWED_HOSTS`. For custom domains, add the API domain to `ALLOWED_HOSTS` and the frontend domain to both CORS and CSRF variables. Configure email variables if password reset or email workflows are enabled.

## 3. Deploy the web client

Create a second Vercel project from the same repository with **Root Directory** set to `web/` and the Vite framework preset. Vercel uses `npm run build` and the `dist/` output. `web/vercel.json` rewrites React Router routes to `index.html`.

Set this variable on the web project for Production and Preview as needed:

| Variable | Value |
| --- | --- |
| `VITE_API_BASE_URL` | `https://<backend-domain>/api/v1` |

Redeploy the web project after changing this value because Vite embeds `VITE_*` variables at build time.

## 4. Apply database migrations

After setting the backend Production variables, link the backend directory to its Vercel project and pull those variables locally. The pulled file is ignored by Git:

```powershell
cd backend
vercel link
vercel env pull .env.vercel.local --environment production
$env:DJANGO_ENV_FILE = '.env.vercel.local'
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py createsuperuser
Remove-Item Env:DJANGO_ENV_FILE
```

Create the local environment first if needed:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

For macOS/Linux, activate with `source .venv/bin/activate` and run `DJANGO_ENV_FILE=.env.vercel.local python manage.py migrate`.

## 5. Verify deployment

- Open `https://<backend-domain>/api/v1/docs/` and confirm the API responds.
- Open the frontend and test login, refresh-token flow, trainee/staff lists, and finance reports.
- Confirm the frontend URL is listed exactly in backend CORS and CSRF settings.
- Upload a trainee image to verify Cloudinary credentials and storage are configured.
- Keep database credentials, Django secret, Cloudinary secret, and SMTP password only in Vercel environment settings or ignored local env files.

The backend is stateless on Vercel, so uploaded media must use Cloudinary (already configured in Django settings); do not rely on local disk persistence. Run migrations as a separate deployment step, not when each serverless request starts.
