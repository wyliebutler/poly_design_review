# Testing Environment

**Important Notice:**
As of March 2026, local testing (`localhost:3000`) is **deprecated** for this project.

All testing, especially for file uploads, server actions, and database migrations, **must** be conducted against the remote test environment.

- **Test Server IP:** `192.168.2.200`
- **Deployment Script:** Use `.\deploy.ps1` to deploy changes to the test server before testing.

This ensures all features are tested in an environment matching the production Docker and Nginx configurations, particularly for payload limits and permission boundaries.
