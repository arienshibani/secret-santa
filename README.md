# Secret Santa Web App 🎄🎁

A beautiful, festive Secret Santa web application that makes organizing your gift exchange easy and fun. Features multi-language support (English, Norsk, Nynorsk), animated snow effects, and a complete admin dashboard.

<img width="406" height="486" alt="image" src="https://github.com/user-attachments/assets/130cd9bb-d617-4d97-8720-e3a863aaeab4" />

## How It Works

### For Event Organizers

1. **Create Your Event**: Set up your Secret Santa event by entering the number of participants and your preferred contact method (email or phone).

2. **Add Participants**: Fill in the names and contact information for everyone participating in the gift exchange.

3. **Get Assignment Links**: The app automatically shuffles participants to ensure no one gets assigned themselves, then generates a unique, secure link for each participant.

4. **Share the Links**: Copy and send each participant their personal link. They'll use this link to see who they're assigned to buy a gift for.

5. **Track Progress**: Use the admin dashboard (protected by a PIN) to see who has marked their gift as ready, without revealing anyone's assignments.

### For Participants

1. **Receive Your Link**: You'll receive a unique link from the event organizer.

2. **Click Your Link**: Open the link to see who you've been assigned to buy a gift for.

3. **Mark Gift Ready**: Once you've purchased your gift, you can mark it as ready through your assignment page.

4. **Keep It Secret**: Your assignment is private - only you can see who you're buying for!

## Features

- 🎄 **Festive Design**: Christmas-themed UI with animated snow effects
- 🎲 **Smart Shuffling**: Ensures no self-assignments and no duplicate assignments
- 🌍 **Multi-language Support**: English, Norsk (Bokmål), and Nynorsk
- 📱 **Mobile Responsive**: Works perfectly on all devices
- 🔐 **Secure & Private**: Each participant gets a unique link - assignments stay secret
- 👨‍💼 **Admin Dashboard**: Track gift status without revealing assignments
- 🎁 **Gift Tracking**: See who has completed their shopping
- 📅 **Event Date**: Set a date and time for the event, automatically deletes contact information 7 days after the event.

## Admin Dashboard

The admin dashboard allows you to:

- **Track Gift Status**: See which participants have marked their gifts as ready
- **Monitor Progress**: Get an overview of how many gifts have been purchased
- **Manage Participants**: Add or remove participants, update contact information
- **Customize Settings**: Set event dates, customize message templates, and more

All of this is done **without revealing anyone's assignments** - the secrecy of the gift exchange is maintained!

## Privacy & Security

- Each participant receives a unique, secure link that cannot be guessed
- Assignments are only visible to the person who received the link
- Admin dashboard shows gift status only, never reveals who is assigned to whom
- All data is securely stored and encrypted

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the SQL from `supabase-schema.sql`
3. Get your Supabase URL and anon key from Project Settings > API

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
PUBLIC_SUPABASE_URL=your_supabase_url_here
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
JWT_SECRET=your-random-secret-key-here
```

See `ENV_SETUP.md` for detailed instructions.

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see the app.

## Deployment to Vercel

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

Vercel will automatically detect SvelteKit and configure the build.

## License

MIT
