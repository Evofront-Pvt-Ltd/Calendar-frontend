# Calendar Booking Frontend

Next.js frontend for the dynamic scheduling platform.

## Run Everything With Docker

From the backend folder:

```powershell
cd C:\Users\mukes\Calendar-Backend
docker compose up --build
```

Open:

- Frontend: `http://127.0.0.1:3000`
- Login: `http://127.0.0.1:3000/login`
- Backend API: `http://127.0.0.1:8001`
- API docs: `http://127.0.0.1:8001/docs`

## Local Frontend Run

```powershell
npm.cmd install
copy .env.local.example .env.local
npm.cmd run dev
```

The backend must be running separately on `http://127.0.0.1:8001` or `NEXT_PUBLIC_API_URL` must be adjusted.

Optional frontend environment values:

```text
NEXT_PUBLIC_API_URL=http://127.0.0.1:8001
NEXT_PUBLIC_ORGANIZATION_EMAIL_DOMAIN=evofront.com
```

The organization domain is only a client-side hint for form feedback. The backend remains the source of truth for validating member email domains.

## Product Flow

1. Register a host account.
2. Verify the signup with the console OTP locally, or Twilio SendGrid email OTP when enabled.
3. Select or create a product from the sidebar product selector.
4. Add product team members with organization email addresses.
5. Create one or more product-scoped event links.
6. Adjust product weekly availability and buffers.
7. Create product team meetings and copy invitation links while email delivery is disabled.
8. Open or share `/book/{user-slug}/{event-slug}` for public scheduling.
9. Invitees select a live slot and confirm a booking.
10. The dashboard shows product-scoped bookings, invitations, contacts, and team members.
