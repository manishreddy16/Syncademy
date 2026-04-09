# Sample Credentials

These sample credentials are provided as examples for testing the Syncademy application.

## Admin Credentials
- Email: `admin@example.com`
- Password: `password`
- School ID: `1`

> Note: These are sample values only. To use them in your Firebase project, register a school admin account with these values or update the app to seed the same credentials.

## Student Credentials
- Email: `student@example.com`
- Password: `password`
- Roll Number: `RV-001`
- School ID: `1`

## How to Test
1. Register the admin account via the **Register School Admin** page.
2. Copy the generated `School ID` and provide it when registering the student.
3. Approve the student registration from the admin portal.
4. Log in as the student using the provided email and password.

## Notes
- Student logins are accepted only after admin approval.
- Offline actions such as assignment submission, resource upload, and payment requests are queued locally and synced automatically when connectivity returns.
