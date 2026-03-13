# Database setup (fix "Environment variable not found: DATABASE_URL")

The app needs PostgreSQL. Use **one** of these:

---

## Option A — PostgreSQL on your PC

1. **Install PostgreSQL**
   - Download: https://www.postgresql.org/download/windows/
   - Run the installer. Remember the **password** you set for the `postgres` user.

2. **Create the database**
   - Open **pgAdmin** (installed with PostgreSQL) or any SQL client.
   - Connect to `localhost` with user `postgres` and your password.
   - Create a database named: `altaris_capital`.

3. **Set `.env`**
   - Open `.env` in the project root.
   - Set this line (use your real password):
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/altaris_capital"
   ```
   - If your username is not `postgres` or port is not `5432`, change those in the URL.

4. **Create tables**
   ```powershell
   cd C:\Users\ADMIN\altaris-capital\altaris
   pnpm exec prisma db push
   ```

5. **Restart the app**
   ```powershell
   pnpm dev
   ```

---

## Option B — Free cloud PostgreSQL (no install)

1. **Get a free database**
   - Go to https://neon.tech (or https://supabase.com).
   - Sign up, create a project, and copy the **connection string** (PostgreSQL URL).

2. **Set `.env`**
   - Open `.env` in the project root.
   - Set:
   ```env
   DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
   ```
   - Paste your real connection string from Neon/Supabase (it already looks like the above).

3. **Create tables**
   ```powershell
   cd C:\Users\ADMIN\altaris-capital\altaris
   pnpm exec prisma db push
   ```

4. **Restart the app**
   ```powershell
   pnpm dev
   ```

---

## If it still says "DATABASE_URL not found"

- Make sure the file is named exactly `.env` (no `.env.txt`) and is in the `altaris` folder (same folder as `package.json`).
- Restart the dev server after changing `.env` (stop with Ctrl+C, then run `pnpm dev` again).
