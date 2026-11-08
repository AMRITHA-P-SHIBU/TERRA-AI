# Terra AI (EcoSphere AI) 🌿
### AI-Powered Sustainable Living, Authentication, Organization Approval & RBAC System

Terra AI is a web-based sustainability management platform integrating community action, circular economy, and intelligent environmental guidance. This repository implements the complete enterprise authentication, organization verification lifecycle, and role-based access control (RBAC) foundation.

---

## 🏛️ Account Types & Role Architecture

1. **INDIVIDUAL (Citizen / Eco Champion)**:
   - Self-registers at `/signup/individual`.
   - No approval needed; status is immediately `ACTIVE`.
   - Direct access to the Individual Dashboard (`/dashboard/individual`), GreenFeed, Eco Exchange, Carbon Footprint Calculator, and AI Eco Assistant.

2. **ORG_ADMIN (Organization Representative)**:
   - Registers an organization at `/signup/organization` with official credentials and verification document.
   - The organization starts with `PENDING` approval status.
   - Enforced by `requireApprovedOrganization` middleware: unapproved organizations are blocked from the organization dashboard and routed to `/pending-approval`.
   - Once approved by Super Admin, activates the Organization Dashboard (`/dashboard/organization`) with team management and member invitations.

3. **SUPER_ADMIN (Main Website Governance Admin)**:
   - Created **only** via the backend seed script (`npm run seed:admin`), never through public signups.
   - Accesses `/admin/login` and the Super Admin Console (`/dashboard/admin`).
   - Reviews pending organization requests, views securely stored verification documents, approves or rejects organizations (with mandatory reason), applies suspensions or reactivations, and governs all platform users.

---

## 🔐 Strict Security & Data Isolation Rules

- **Backend Enforcement**: Frontend redirects are UX-only. All authorizations are strictly verified in Express middleware (`authenticate.js`, `authorize.js`, `requireApprovedOrganization.js`).
- **Org-Level Data Isolation**: Never trusts `organization_id` from request parameters or body. The organization is derived solely from the authenticated user's `organization_members` record. Cross-organization access attempts are blocked.
- **Secure Storage**: Verification documents are stored in private server storage (`server/uploads/documents/`), never served publicly, and accessible exclusively to `SUPER_ADMIN` via authenticated endpoints.
- **Cryptographic Standards**: Password hashing using `bcryptjs` with salt rounds 12. Short-lived JWT access tokens + refresh tokens stored in secure, HttpOnly, SameSite cookies.
- **Audit Logging**: Every administrative decision (approval, rejection, suspension, reactivation) creates an immutable record in `organization_approval_logs`.

---

## 🗄️ Database Schema (PostgreSQL, UUID Primary Keys)

The system is backed by five relational PostgreSQL tables:

1. **`users`**:
   `id` (UUID PK), `full_name`, `email` (unique), `password_hash`, `account_type` (`INDIVIDUAL` | `ORG_ADMIN` | `SUPER_ADMIN`), `status` (`ACTIVE` | `PENDING` | `SUSPENDED`), `email_verified` (bool), `created_at`.
2. **`organizations`**:
   `id` (UUID PK), `name`, `organization_type`, `registration_number`, `official_email`, `contact_number`, `address`, `website`, `document_url`, `approval_status` (`PENDING` | `APPROVED` | `REJECTED` | `SUSPENDED`), `reviewed_by` (FK → users.id), `reviewed_at`, `rejection_reason`, `created_at`.
3. **`organization_members`**:
   `id` (UUID PK), `organization_id` (FK), `user_id` (FK), `role` (`ORG_ADMIN` | `MEMBER`), `status` (`ACTIVE` | `INVITED` | `SUSPENDED`), `joined_at`. Unique on `(organization_id, user_id)`.
4. **`organization_approval_logs`**:
   `id` (UUID PK), `organization_id` (FK), `admin_id` (FK → users.id), `action` (`APPROVED` | `REJECTED` | `SUSPENDED` | `REACTIVATED`), `remarks`, `created_at`.
5. **`auth_tokens`**:
   `id` (UUID PK), `user_id` (FK), `token`, `token_type` (`EMAIL_VERIFICATION` | `PASSWORD_RESET` | `MEMBER_INVITATION`), `metadata`, `expires_at`, `created_at`.

Indexes are applied on `users(email)`, `organizations(approval_status)`, `organization_members(organization_id, user_id)`, and `organization_approval_logs(organization_id, admin_id)`.

---

## 🛠️ Tech Stack

- **Frontend**: React 19 (Vite), React Router v7, Context API (`AuthContext`), Tailwind CSS, Lucide React icons.
- **Backend**: Node.js + Express.js.
- **Database Client**: `pg` (PostgreSQL Connection Pooling with automated migrations and development fallback).
- **Security & Validation**: `bcryptjs`, `jsonwebtoken`, `zod`, `helmet`, `cors`, `cookie-parser`, `express-rate-limit`, `multer`.

---

## 🚀 Setup & Execution Guide

### 1. Environment Configuration

#### Backend (`server/.env`):
```env
PORT=3000
NODE_ENV=development

# PostgreSQL Connection String (Supabase or Local Postgres)
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
DB_SSL=false

# Client URL (for CORS and cookie authorization)
CLIENT_URL=http://localhost:5173

# Auth Secrets
JWT_SECRET=terra_ai_jwt_secret_key_access_token_secure_random_2026
JWT_REFRESH_SECRET=terra_ai_jwt_refresh_secret_key_secure_random_2026
COOKIE_SECRET=terra_ai_cookie_signing_secret_phrase

# Seed Super Admin Credentials
SUPER_ADMIN_NAME="Terra Chief Admin"
SUPER_ADMIN_EMAIL="admin@terra.eco"
SUPER_ADMIN_PASSWORD="AdminSecurePassword123!"
```

#### Frontend (`client/.env`):
```env
VITE_API_BASE_URL=http://localhost:3000
```

---

### 2. Database Migrations

Run the SQL migration script to create all 5 tables and foreign key indexes in PostgreSQL:
```bash
cd server
npm run migrate
```

#### Profile, GreenFeed, and media-post workflow

The app's current sign-in system uses the existing Express HttpOnly-cookie JWT accounts in `public.users` (not browser Supabase Auth sessions). After the initial schema is installed, open the SQL Editor for the **same existing Supabase project/database** and run [`server/migrations/004_social_profiles_and_posts.sql`](./server/migrations/004_social_profiles_and_posts.sql). Do not create another Supabase project or client.

The migration backfills `individual_users` and `organization_users` from existing `users` and `organization_members`, adds scoped post/like/comment/review tables and policies, and creates the private `post-media` Storage bucket. It retains an incompatible legacy GreenFeed `posts` table under `legacy_greenfeed_posts`; old Auth-ID posts are not automatically copied into the cookie-auth tables because those IDs are not guaranteed to represent the same accounts.

Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the **server** environment for private uploads, signed media URLs, and server-side post review. Never expose the service-role key to the client. The client continues to use the current API and auth cookies. Profile, feed, and moderation access is checked by the authenticated server API; direct anonymous Supabase access is denied by RLS.

The migration includes media size/type constraints (10 MB images, 50 MB videos) and the UI checks video duration up to 60 seconds. Review-queue routing is derived from the author's database profile: individual requests go to Super Admin; organization-member requests are limited to that same organization's active admin.

#### Eco Exchange marketplace

The marketplace continues to use the existing Supabase project and the app's HttpOnly-cookie authentication. In the SQL Editor for that same project, run [`supabase/migrations/005_eco_exchange_marketplace.sql`](./supabase/migrations/005_eco_exchange_marketplace.sql), followed by [`supabase/migrations/006_eco_exchange_manual_locations.sql`](./supabase/migrations/006_eco_exchange_manual_locations.sql). If migration 005 has already been applied, run only migration 006. Then run [`supabase/scripts/cleanup_eco_exchange_dummy_data.sql`](./supabase/scripts/cleanup_eco_exchange_dummy_data.sql) to remove the former example listings from `marketplace_items`. Do not run these scripts against a new project.

Add `VITE_GOOGLE_MAPS_API_KEY` to `client/.env` and add `SUPABASE_JWT_SECRET` plus `ECO_EXCHANGE_SCOPE=global` to `server/.env`. The Supabase JWT secret is used only by the authenticated server to authorize participant-filtered Realtime subscriptions; never add it or the service-role key to the client. If the marketplace should use the existing individual/organization visibility boundaries instead, set `ECO_EXCHANGE_SCOPE=scoped`.

In Google Cloud, enable **Maps JavaScript API**, **Places API**, and **Geocoding API**. Restrict the browser key by HTTP referrer to the development and production app domains. A location address is required, but users may type a city, landmark, or address and publish without selecting a map pin; distance and map-pin display are unavailable for manual-only locations. The migration creates the public-read `eco-listings` image bucket and adds `eco_listings`, conversations, messages, offers, reports, notifications, and points-award tables with RLS. Confirm `eco_listings`, `exchange_offers`, `messages`, and `eco_exchange_notifications` are included in the Supabase `supabase_realtime` publication. Public listing location details are filtered by the server; exact coordinates are only returned to the owner or conversation participants.

---

### 3. Seed Platform Super Admin

Create the master administrator account from environment variables:
```bash
cd server
npm run seed:admin
```
Default credentials:
- **Email**: `admin@terra.eco`
- **Password**: `AdminSecurePassword123!`
- **Portal URL**: `http://localhost:5173/admin/login`

---

### 4. Running the Development Servers

#### Start Express Backend:
```bash
cd server
npm run dev
```
API running on `http://127.0.0.1:3000`.

#### Start Vite React Client:
```bash
cd client
npm run dev
```
Client running on `http://localhost:5173`.

---

## 🧪 Automated Verification Suite

Run the full end-to-end automated RBAC test suite with 30 assertions:
```bash
cd server
node scripts/testAuthFlow.js
```

---

## 📋 Manual Test Checklist

| # | Test Scenario | Steps to Execute | Expected Behavior |
|---|---|---|---|
| 1 | **Explore Now Navigation** | From `/`, click "Explore Platform" or "Explore Now" | Directs unauthenticated user to `/signup` (Choose Account Type: Individual Citizen vs Organization). If logged in, opens user's authorized dashboard. |
| 2 | **Individual Citizen Signup** | Navigate to `/signup/individual`, fill form with valid email & password, submit | Creates user with `account_type: INDIVIDUAL`, `status: ACTIVE`. Immediately opens `/dashboard/individual`. |
| 3 | **Organization Registration** | Navigate to `/signup/organization`, fill org & representative details, upload certificate, submit | Shows notice: *"Your organization registration request is pending admin approval."* Redirects to `/pending-approval`. |
| 4 | **Pending Org Access Blocked** | Try to open `/dashboard/organization` or call `GET /api/organizations/my` with pending token | Middleware blocks request with `HTTP 403 Forbidden` (`code: ORGANIZATION_NOT_APPROVED`). Redirects to `/pending-approval`. |
| 5 | **Super Admin Review & Approval** | Log in at `/admin/login` as `admin@terra.eco`. Go to "Pending" tab. Click "Approve". | Status changes to `APPROVED`. Creates log in `organization_approval_logs`. Representative user activated. |
| 6 | **Approved Org Dashboard Access** | Org admin refreshes `/pending-approval` or logs in | Redirects into `/dashboard/organization`. Org admin can invite team members via modal. |
| 7 | **Organization Suspension** | Super Admin clicks "Suspend" on an organization in `/dashboard/admin` | Organization status transitions to `SUSPENDED`. Org admin dashboard access is immediately blocked with `HTTP 403`. |
| 8 | **Cross-Organization Isolation** | Send requests to `/api/organizations/my/members` | User can only see members of their own organization derived from JWT session. Changing parameters has no effect. |
