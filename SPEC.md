Absolutely, Dr. Yan. Below is a ready-to-use SPEC.md tailored exactly to your stray / animal-in-need reporting website, written at a level that supports parent–teen collaboration, Codex execution, and later expansion.

You can paste this directly into Codex and ask it to create the file verbatim, or copy it yourself into SPEC.md.

⸻

🐾 SPEC.md — Animal Help Map (MVP)

1. Project Goal

Create a simple, compassionate public website that allows people to:
	•	Report stray or injured animals they encounter
	•	View reported animals on a map
	•	Find nearby animal shelters and veterinary clinics that may help

The website is designed as a public-good project created by a parent and a teenage daughter, emphasizing empathy, clarity, and safety.

The MVP focuses on connecting people to help, not replacing professionals or emergency services.

⸻

2. Target Users

Primary Users
	•	Passersby who encounter a stray, injured, or trapped animal
	•	Volunteers or rescuers browsing recent reports
	•	Concerned citizens who want to help but don’t know where to start

Secondary Users
	•	Animal welfare volunteers
	•	Students and young people learning civic responsibility

⸻

3. Pages / Routes (MVP Only)

3.1 Home (/)

Purpose:
	•	Briefly explain what the site does
	•	Guide users to either report an animal or view animals in need

Content:
	•	Short mission statement
	•	Two clear buttons:
	•	“Report an Animal in Need”
	•	“View Animals on the Map”
	•	Gentle disclaimer:
“This site is not an emergency service. If an animal is in immediate danger, please contact local authorities or emergency veterinary services.”

⸻

3.2 Report Animal (/report)

Purpose:
	•	Allow users to submit information about an animal in need

Key features:
	•	Simple form
	•	Clear, non-technical language
	•	Encouraging, non-judgmental tone

⸻

3.3 Map View (/map)

Purpose:
	•	Show reported animals visually on a map
	•	Help users understand where help is needed

Key features:
	•	Map with pins
	•	Click pin to see basic animal information
	•	Option to view nearby shelters and vets

⸻

4. Data Fields — Animal Report

Each report represents one animal or one observed situation.

Core Fields

Field Name	Type	Required	Description
id	string	Yes	Unique report ID
created_at	datetime	Yes	Time of report submission
species	enum	Yes	Dog, Cat, Bird, Other
condition	enum	Yes	Injured, Sick, Trapped, Stray, Nursing, Unknown
description	text	Optional	Free-text notes (appearance, behavior, concerns)
latitude	number	Yes	Latitude of observed location
longitude	number	Yes	Longitude of observed location
location_description	string	Optional	Human-readable location (e.g. “near bus stop, under tree”)
photo_urls	array	Optional	Uploaded photos (future extension)
status	enum	Yes	Reported / Help Found / Resolved
reporter_contact	string	Optional	Email or phone (optional, not public)


⸻

5. User Stories (MVP)

Story 1 — Reporting an Animal

As a passerby,
I want to quickly report an animal that looks injured or abandoned,
so that others or professionals nearby may help.

Acceptance:
	•	I can submit a report in under 2 minutes
	•	I don’t need to create an account
	•	I can describe the animal in simple words

⸻

Story 2 — Viewing Animals on a Map

As a concerned citizen or volunteer,
I want to see animals reported near me on a map,
so I can decide whether I can help.

Acceptance:
	•	I can open the map and see pins
	•	Pins show basic info (species, condition, time)
	•	I can click a pin to see more details

⸻

Story 3 — Finding Nearby Help

As someone who wants to help an animal,
I want to see nearby shelters or vets,
so I know who to contact.

Acceptance:
	•	For a given report, I can see a list of nearby shelters and vets
	•	Each listing shows name and distance
	•	I can tap a link to get directions or call

⸻

6. User Flow (Happy Path)
	1.	User lands on Home page
	2.	Clicks “Report an Animal in Need”
	3.	Fills out short form
	4.	Selects or confirms location on map
	5.	Submits report
	6.	Sees confirmation message
	7.	Other users see the report appear on the map
	8.	Users can view nearby shelters/vets for that location

⸻

7. Acceptance Criteria for MVP

The MVP is complete when:
	•	✅ A user can submit an animal report without logging in
	•	✅ Reports are stored and retrievable
	•	✅ Reports appear on a map with location pins
	•	✅ Clicking a report shows animal details
	•	✅ Nearby shelters and vets are displayed based on location
	•	✅ Site includes a safety disclaimer
	•	✅ UI language is clear and compassionate

⸻

8. Out of Scope (Explicitly NOT in MVP)

The following are intentionally excluded from MVP:
	•	User accounts or login
	•	Moderation or verification workflow
	•	Donations or fundraising
	•	Messaging or chat
	•	AI analysis or triage
	•	Push notifications
	•	Social media sharing
	•	Exact real-time tracking

⸻

9. Safety & Privacy Considerations
	•	Do not display reporter contact information publicly
	•	Avoid encouraging direct confrontation with aggressive animals
	•	Show approximate locations if needed (future)
	•	Emphasize professional help for emergencies
	•	Use gentle language suitable for minors

⸻

10. Guiding Values
	•	Compassion over efficiency
	•	Clarity over features
	•	Helping humans help animals
	•	Safe participation for young people

⸻

✅ Next Recommended Codex Command

Once this file exists, your next Codex instruction should be:

“Initialize a minimal Next.js TypeScript project based on SPEC.md. Create placeholder pages for Home, Report, and Map. Do not add database or APIs yet.”

If you’d like, next I can:
	•	convert this into a child-friendly version for your daughter, or
	•	help you craft Prompt #2 and #3 exactly as Codex inputs, or
	•	review this SPEC.md from a real product reviewer’s perspective and tighten it further.
