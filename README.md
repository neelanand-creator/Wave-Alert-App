# QuakeGuard

A deployable Next.js website for recent earthquake activity and an AI earthquake Q&A assistant.

## Features
- Recent USGS earthquake events (past 24 hours), refreshed every 60 seconds.
- Browser geolocation opt-in and events filtered to a 100 km radius, sorted by distance.
- Magnitude, reported location, event time, distance, and links to USGS event details.
- QuakeGuard AI chatbot grounded in the current earthquake feed provided by the app.
- Responsive dark interface, safety reminder, and official preparedness links.
- Location coordinates are only held in client-side page state; this app does not store them.

## Run locally
1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env.local`.
3. Add your OpenAI API key to `.env.local`:
   `OPENAI_API_KEY=...`
4. Install and run:
   ```bash
   npm install
   npm run dev
   ```
5. Visit http://localhost:3000.

Without an API key, the live earthquake monitor still works, but the AI chat endpoint will display a setup message.

## Publish with Vercel
1. Create a GitHub repository and upload the contents of this folder.
2. Import the repository at https://vercel.com/new.
3. In the Vercel project settings, add environment variables:
   - `OPENAI_API_KEY` = your secret API key
   - `OPENAI_MODEL` = `gpt-4.1-mini` (optional)
4. Deploy. Vercel will detect Next.js automatically.

Keep the API key in server-side environment variables. Never put it in client-side code or commit `.env.local`.

## Data and limitations
- Earthquake feed: USGS GeoJSON `all_day` feed (recent global earthquakes over the past day). USGS may revise event values and there can be reporting delays.
- The 100 km radius applies to the recent events returned by this feed. It is not a complete geological record and does not predict future earthquakes.
- The app does not issue official emergency alerts, determine structural safety, or predict earthquakes.
- Browser geolocation generally requires HTTPS (Vercel provides HTTPS) and user permission.
- If the user denies location access, global recent events remain visible; the app cannot calculate the user's local radius without coordinates.
- The chatbot uses a server-side OpenAI API call and is limited by model knowledge, supplied feed context, and service availability. No AI can guarantee answers to every question or reliably predict earthquakes.

## Before public launch
- Add a privacy policy and contact/support details suitable for your use.
- Consider rate limiting `/api/chat` and adding abuse protection before sharing widely; API usage can incur costs.
- Test on mobile and desktop, check API limits, and review emergency wording for your intended audience.
