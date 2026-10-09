# Google Play listing (en-US), as entered in Play Console

Positioning (owner, 2026-10-09): an **advanced English game** for anyone, worldwide. CAT appears once, as the exam the questions are built on, never as the headline.

**App name** (30): CAT OS: Advanced English

**Short description** (80): Advanced English as a game: read deeper, reason sharper, and grow a village.

**Full description:**

CAT OS turns advanced English into a game. Read demanding passages, untangle arguments, learn the words careful writers use, and watch a little painted village grow every time you get better.

Eight friends live in the village, one for each English skill. Answer well and the friend who teaches that skill grows up, their house grows, and the village comes alive. Nothing grows for time spent. It grows for learning.

WHAT YOU PRACTISE
• Reading comprehension: original passages on science, philosophy, economics, art and history, from first steps to the hardest level, timed when you want the pressure.
• Para jumbles: put the sentences back in the author's order, then see why each join holds.
• Summaries: find the summary that keeps the author's point, not just the words.
• Odd one out: spot the sentence that breaks the paragraph.
• Sentence placement, paragraph completion, word bank and critical reasoning sets.
• Vocabulary rounds and word families that stick.

EXPLANATIONS THAT TEACH
After every answer you see whether you were right and what the answer was. Open the full explanation to learn why your pick tempted you, why the answer holds, and how every other option was built to trap you, plus one reading habit to carry into the next question.

A MENTOR THAT NOTICES
CAT OS remembers the traps you fall for and the skills you are building, and brings back the right questions at the right time.

WHO IT IS FOR
Anyone who wants English that holds up when the text gets hard: students, graduates, professionals, and anyone preparing for a demanding English exam.

BUILT ON THE CAT
Every question is modelled on the famously hard verbal section of the CAT, the entrance exam for India's top business schools. Preparing for CAT VARC? This is your practice ground. Not taking the CAT? It is simply some of the hardest, best-explained English practice you can play.

FREE, WITH ONE KIND OF AD
CAT OS is free. The only ad is a short video you choose to watch to open full explanations, and one video opens every explanation for 20 minutes. No banners. No pop-ups. The free app needs an internet connection.

CAT OS PRO
No videos, every explanation open, and the village plays offline. One year or lifetime.

YOUR PROGRESS, SAFE
Your village lives on your phone. Sign in with Google if you like, and it is saved to your account and comes back on a new phone. Or export a backup file any time.

CAT OS is an independent app. It is not affiliated with the IIMs or the Common Admission Test.

**Category:** Education · **Tags:** Education, Language education, Test preparation · **Contact:** voranakul1@gmail.com · **Website:** https://naaaakuu.github.io/CAT-OS/ · **Privacy policy:** https://naaaakuu.github.io/CAT-OS/privacy.html (account deletion: `#delete-account`)

**Video:** https://www.youtube.com/watch?v=2visFJqtsK0 (16:9, 30 s, the listing's promo). Short: https://youtube.com/shorts/96vS60ifgFs. Both on the owner's YouTube channel, public, made from the real app (`../brag-output/`, outside the repo).

## Products (Monetize, Products)

| Product id | Type | Default price | Notes |
|---|---|---|---|
| `catos_pro_yearly` | Subscription, base plan `yearly`, auto-renewing, 1 year | ₹499 | "CAT OS Pro (1 year)" |
| `catos_pro_lifetime` | One-time product | ₹1,299 | "CAT OS Pro (Lifetime)" |

Set the INR price and let Play convert it for every other country (local rounding included); the Pro screen shows whatever Play charges, in the learner's currency. ₹499 a year is about ₹42 a month; lifetime is about 2.6 years of the yearly plan.

## Play Console state (2026-10-09, 3.12.0)

App id 4976374917894694481, personal account Nakul Creations. Done: privacy policy URL, sign-in details (nothing restricted; sign-in is optional), ads (yes), content rating (IARC), target audience 18+, data safety (as of 3.11.0: AdMob data, no accounts), advertising ID, category, tags, contact details, default store listing (3.12.0 text, video, icon, feature graphic, six screenshots: saved as a draft until changes are sent for review), internal testers, closed-testing track "Alpha" targeting all 178 countries (no release on it yet). Production is locked until the closed test.

Left for the owner:
1. `android/app/google-services.json` from the Firebase console (project `cat-os-612e8`), then a 3.12.0 AAB to upload to internal testing (over the browser tool's 10 MB cap).
2. Payments profile (Play Console, Settings, Payments profile: legal name, address, tax, bank), then the two products above.
3. Data safety for 3.12.0: add Personal info (name, email, user IDs; collected, not shared, optional; account management and app functionality), the Analytics purpose on app interactions, device IDs, diagnostics, crash logs and approximate location, "users can create an account" with the deletion URL above.
4. AdMob: publish the draft message "CAT OS - GDPR consent", turn on consent mode, link the app to Firebase; once the app is live, add the Play listing to the AdMob app. `app-ads.txt` needs the root of the website's domain (`naaaakuu.github.io/app-ads.txt`, a user-site repo) with `google.com, pub-2797167472636000, DIRECT, f08c47fec0942fa0`.
5. Closed test with at least 12 testers for 14 days, then "Apply for production" and pick all countries.

## Ads

AdMob app `ca-app-pub-2797167472636000~2881643697`, one rewarded unit `ca-app-pub-2797167472636000/9244795501` ("Full explanation (rewarded)"). No other ad formats.
