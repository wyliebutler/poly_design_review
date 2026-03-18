# White-Label Design Portal

The White-Label Design Portal is a real-time, interactive 3D STL viewer and design review platform. It enables engineers and clients to upload CAD models, track version histories, and collaborate through real-time localized comments directly pinned to the 3D geometry.

![Main Conversation Window](./docs/screenshot.png)

## Features
- **Real-Time 3D Rendering**: Upload and instantly visualize `.stl` design files directly in the browser.
- **Iterative Version Control**: Maintain multiple revisions of a design under a unified project framework.
- **Email Notifications**: Integrated Resend API for per-project staff alerts and secure, anonymous client subscription management.
- **Visual Diff Viewer**: Dynamically overlay consecutive revisions in 3D to rapidly spot changes (Additions = Green, Deletions = Red, Unchanged = Yellow).
- **Pinned 3D Feedback**: Click directly onto the 3D model to drop a pin and leave precise, localized feedback.
- **Live Server-Sent Events**: Discussion threads and version histories sync across all viewers in real-time without needing a manual refresh.
- **Snapshots & Attachments**: Attach 2D camera snapshots and reference files directly to feedback comments.
- **Data Export**: Bundle and download the complete timeline of a project via ZIP archive.

## Tech Stack
- **Framework**: Next.js 15 (App Router, Server Actions)
- **Database ORM**: Prisma (PostgreSQL via Docker)
- **3D Engine**: Three.js (`@react-three/fiber` / `@react-three/drei`)
- **Real-Time Pipeline**: Server-Sent Events (SSE) via native API Route Handlers

---

## Deployment Instructions (Docker)

The application relies on Docker to provide a simplified, sandboxed deployment. The persistent PostgreSQL database, file uploads, and Next.js instance are contained neatly together using `docker-compose.yml`.

### Prerequisites
- Install [Docker](https://docs.docker.com/get-docker/)
- Install [Docker Compose](https://docs.docker.com/compose/install/)
- A GitHub Personal Access Token (PAT) with `read:packages` permissions.

### 1. Authenticate with GitHub Container Registry
Since the Docker image is hosted privately on GitHub, you must log in:

```bash
docker login ghcr.io -u YOUR_GITHUB_USERNAME
# When prompted for a password, paste your Personal Access Token (PAT)
```

### 2. Environment Setup
Create a `.env` file and `docker-compose.yml` on your server. 

```bash
# .env
AUTH_SECRET="some-secure-random-string"
# CRITICAL: ADMIN_PASSWORD must be set or the portal will refuse logins
ADMIN_PASSWORD="my-secure-password"
NODE_ENV="production"
RESEND_API_KEY="re_123456789_abcdefg"
RESEND_FROM_EMAIL="notifications@yourdomain.com"
```

*Note: The `DATABASE_URL` is automatically provided by `docker-compose.yml`.*

### 3. File Permissions
The 3D design files and snapshot images are saved to the server's disk inside the `public/uploads` directory. Because the Docker container runs securely as a non-root user (`nextjs`), this remote directory must exist and be writable before starting the app:

```bash
mkdir -p public/uploads
chmod -R 777 public/uploads
```

### 4. Spin Up Docker Containers
If you have configured GHCR access (or made the package public), simply pull and start the containers. The Next.js container will automatically verify and initialize the database schema.

```bash
docker compose pull app
docker compose up -d
```

### Alternative: Build Locally (Bypass Registry)
If you prefer not to use the GHCR registry or are encountering authentication issues, you can always build the application directly from the source code on your server:

1. Update the `docker-compose.yml` file to build locally by replacing `image: ghcr.io/wyliebutler/poly_design_review:latest` with `build: .`
2. Pull the latest source code: `git pull origin main`
3. Build and run: `docker compose up -d --build`

Once completed, the portal should be accessible via port `3000` on your host machine.

---

## How to Update the Application

When a new feature or bug fix is released, updating the live application implies pulling the newest image from the registry and restarting.

1. **Pull the Latest Image**
   ```bash
   docker compose pull app
   ```

2. **Recreate the Containers**
   Docker will automatically recreate the `app` container using the new image, run the database migrations securely, and safely restart the app with minimal downtime.
   ```bash
   docker compose up -d
   ```

*(If you are using the Local Build method instead of the registry, you would run `git pull origin main` followed by `docker compose up -d --build`)*

3. **(Optional) Clean Up Disk Space**
   Docker does not unilaterally delete your old unused images when downloading a new version. To free up storage space on the deployment server over time, routinely prune dangling images:
   ```bash
   docker system prune -f
   ```
