# How to Test the App

This guide covers the local Django API, React web app, platform-admin console, and a short mobile smoke test. Use a local development database only. Do not run these steps against production or real member data.

## 1. Start the Local App

Open two PowerShell terminals from the repository root.

Terminal 1, start Django:

```powershell
cd backend
.\venv312\Scripts\python.exe manage.py migrate
.\venv312\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Terminal 2, start the web app:

```powershell
npm.cmd --prefix web run dev -- --host 127.0.0.1
```

Open the web app at <http://127.0.0.1:5173/>. Check the API documentation at <http://127.0.0.1:8000/api/v1/docs/>.

If the local test accounts are missing, the development seed script can create them:

```powershell
cd backend
.\venv312\Scripts\python.exe setup_test_db.py
```

This script migrates and writes to the configured local database. It does not reset existing data. Never run it against production.

Seed accounts created by that script:

| Role | Username | Password |
| --- | --- | --- |
| Platform administrator | `admin` | `adminpassword123` |
| Organization administrator | `orguser` | `orgstaff` |

These are development-only credentials. Change or remove them before any shared deployment.

## 2. Organization Administrator Checks

Sign in as `orguser`.

1. **Dashboard:** Confirm the organization name and KPI totals load. If the subscription date has passed, confirm it says expired/overdue rather than “expires today.”
2. **Members / trainees:** Add a disposable trainee with first name, last name, date of birth, and phone. Confirm the success message and row appear. Search by a unique name and confirm unrelated trainees disappear. Check Active/Inactive and Category filters.
3. **Edit and delete trainee:** Edit a non-sensitive field and save. Confirm it persists after reloading. Delete only the disposable trainee and confirm it no longer appears.
4. **Trainee photo and documents:** On an existing trainee, upload a small image and a document under 5 MB. Confirm each appears and opens. Delete only the test document and confirm it disappears. The app uses configured Cloudinary storage for these files.
5. **Staff:** Add a disposable staff account with a unique username/email and temporary password. Confirm it appears with role, salary, start date, and last salary-payment date. Edit a field and delete the test account when finished.
6. **Permissions:** Sign in as non-admin staff if available. Confirm they can view organization data but cannot create/edit/delete staff. Do not use the platform account for this check.
7. **Payments:** Record a payment for an existing trainee. Confirm it appears in Payments and dashboard totals. Check date/type filters. Delete only the test payment after checking.
8. **Unpaid:** Change month/year and confirm the unpaid count/list changes according to payment records.
9. **Finance:** Check the annual report and monthly income values against the payment and expense records you created.
10. **Expenses and additional payments:** Create one disposable item in each tab. Confirm each appears and page totals change. Remove the test records afterward.
11. **Events:** Add an event with a title, date, location, description, category, area, numeric costs, and optional participants. Confirm it appears with the participant count. Edit and delete the test event.
12. **Settings:** Save the profile with its existing values, then save the organization with its existing values. Confirm success messages. Change a password only on a disposable account; record the new password and verify you can sign in before changing it again.
13. **Sign out:** Sign out and confirm the login page appears. The refresh token should no longer be accepted.

## 3. Platform Administrator Checks

Sign in as `admin` and open **Organizations**.

1. Confirm the organization list shows owner, subscription status/date, trainee count, and staff count.
2. Open an organization and review its contact details, staff, and subscription history.
3. Open **Edit organization** and save unchanged values first. For any changed values, record the original values so they can be restored.
4. Test **Suspend**, then **Reactivate** the same organization. Confirm its active state returns to the original value.
5. Test organization creation only in a disposable local database. It creates an organization and a new owner account; it is not a reversible form action. Remove test organizations through Django admin when finished.
6. Test renewal only on a disposable organization and with a clearly marked test payment. Renewal records a subscription payment and updates dates/status; it does not charge a payment gateway.
7. Sign in as an organization admin and open `/platform/organizations`. Confirm the API denies access and no cross-organization data is shown.

## 4. API Security Checks

Open PowerShell in the repository root. These checks do not create records:

```powershell
curl.exe -i http://127.0.0.1:8000/api/v1/auth/me/
curl.exe -i http://127.0.0.1:8000/api/v1/platform/organizations/
```

Without a token, both protected endpoints should return `401`. With an organization-admin token, `/platform/organizations/` should return `403`. With a platform-superuser token, it should return `200`.

## 5. Automated Checks

Run from the repository root:

```powershell
npm.cmd --prefix web run build
npm.cmd --prefix web run lint
```

Run the backend suites explicitly from the backend directory. Explicit module names are important because plain `manage.py test` may discover zero tests in this project:

```powershell
cd backend
.\venv312\Scripts\python.exe manage.py check
.\venv312\Scripts\python.exe manage.py makemigrations --check --dry-run
.\venv312\Scripts\python.exe manage.py test api.auth.tests api.auth.test_organization_settings api.tests api.test_web_workflows api.test_platform_admin --noinput
```

Tests use Django's temporary test database. The project may report a CKEditor 4 support warning and OpenAPI serializer-inference warnings; those are separate from test assertions.

## 6. Mobile Smoke Test

From `mobile/`, run the existing Flutter widget tests and then launch against the same local API configuration:

```powershell
flutter test
flutter run
```

Sign in with an organization account and confirm its members/payments load. Verify the mobile client cannot access another organization's records. Avoid testing platform-admin endpoints from the mobile app unless a platform-admin mobile workflow is intentionally added.

## Cleanup

Delete only records and files created specifically for testing. Restore any organization settings changed during the checks. Test subscription renewals and organization creation only on a disposable local database; they create persistent records. Keep real member data and user-created changes untouched.