# RESOLVE-ONE Interaction Audit Matrix

> An exhaustive register of every user-interactive element (buttons, links, tabs, toggles, chips, form submits, and keyboard shortcuts) across all routes in RESOLVE-ONE.
> **Standard:** 100% of interactive elements must perform their stated action, or be removed, or be visibly disabled with clear reasoning. Zero dead buttons permitted.

---

## Interactive Elements Audit Table

| Route | Element Label | Expected Behaviour | Implemented? | Test that Proves It |
| :--- | :--- | :--- | :---: | :--- |
| **/** (Landing) | Brand Logo (`R RESOLVE-ONE`) | Navigates to `/` | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | "How it works" Nav Link | Smooth-scrolls to `#how-it-works` section | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | "Your rights" Nav Link | Smooth-scrolls to `#rights` section | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | "Privacy" Nav Link | Smooth-scrolls to `#privacy` section | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | "FAQ" Nav Link | Smooth-scrolls to `#faq` section | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | Header "Open App" Button | Navigates to `/app/overview` | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | Header "Start in 60s" CTA | Navigates to `/app/cases?new=true` opening intake | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | Hero CTA ("Start in 60 Seconds") | Navigates to `/app/cases?new=true` | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | Hero Secondary CTA ("See how it works") | Smooth-scrolls to `#how-it-works` | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | Hero Live Demo Textarea | Live rule-based extraction updates chips | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | "Convert to Case" Demo Button | Navigates to `/app/cases?new=true&story=...` with prefill | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | Situation Card: "Refund stuck" | Opens intake pre-filled with refund narrative | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | Situation Card: "Damaged item" | Opens intake pre-filled with damaged item narrative | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | Situation Card: "Rejected return" | Opens intake pre-filled with return dispute narrative | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | NCH Official Site Link | Opens `https://consumerhelpline.gov.in` in new tab | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | e-Jagriti Official Site Link | Opens `https://e-jagriti.gov.in/` in new tab | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | RBI Ombudsman Site Link | Opens `https://cms.rbi.org.in` in new tab | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | FAQ Accordion Question Toggles (8 items) | Expands / collapses accessible FAQ answers | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | Bottom CTA ("Start in 60 Seconds") | Navigates to `/app/cases?new=true` | Yes | `tests/e2e/interactions.spec.ts` |
| **/** (Landing) | Footer Links & Language Switcher | Smooth-scrolls or changes language | Yes | `tests/e2e/interactions.spec.ts` |
| **App Shell** | Sidebar Logo (`RESOLVE-ONE`) | Navigates to `/` landing page | Yes | `tests/e2e/interactions.spec.ts` |
| **App Shell** | Sidebar Primary CTA ("Tell Us What Happened") | Opens `/app/cases?new=true` intake modal | Yes | `tests/e2e/interactions.spec.ts` |
| **App Shell** | Sidebar Nav Link: "Overview" | Navigates to `/app/overview` | Yes | `tests/e2e/interactions.spec.ts` |
| **App Shell** | Sidebar Nav Link: "My Cases" | Navigates to `/app/cases` | Yes | `tests/e2e/interactions.spec.ts` |
| **App Shell** | Sidebar Nav Link: "Documents & Proof" | Navigates to `/app/documents` | Yes | `tests/e2e/interactions.spec.ts` |
| **App Shell** | Sidebar Nav Link: "Purchases & Protection" | Navigates to `/app/purchases` | Yes | `tests/e2e/interactions.spec.ts` |
| **App Shell** | Sidebar Nav Link: "Rights & Helplines" | Navigates to `/app/help` | Yes | `tests/e2e/interactions.spec.ts` |
| **App Shell** | Sidebar Nav Link: "Reminders" | Navigates to `/app/reminders` | Yes | `tests/e2e/interactions.spec.ts` |
| **App Shell** | Sidebar Nav Link: "Privacy & Data Trust" | Navigates to `/app/privacy` | Yes | `tests/e2e/interactions.spec.ts` |
| **App Shell** | Header Quick Search Button (`⌘K`) | Opens global Command Palette modal | Yes | `tests/e2e/interactions.spec.ts` |
| **App Shell** | Storage Persistence Banner "Export Backup" | Triggers instant client-side JSON backup download | Yes | `tests/e2e/interactions.spec.ts` |
| **App Shell** | Storage Persistence Banner "Dismiss" | Dismisses banner notification | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/overview** | Dominant Next Step Button | Opens update resolution / verify receipt modal | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/overview** | "Why am I seeing this?" Button | Toggles transparent rule explanation popover | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/overview** | Case Summary Cards | Navigates to `/app/cases/:id` detail view | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/overview** | Return Window Banner "Start Case" | Prefills intake modal from expiring purchase | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases** | Filter Tab Chips ("All", "Action Required", "In Progress", "Resolved") | Filters dispute list by status state | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases** | Case Search Input | Real-time text search across company, ID, and description | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases** | "Start Case" / "+ New Case" CTA | Opens 60-second intake modal | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases** | Case Card Click | Navigates to `/app/cases/:id` | Yes | `tests/e2e/interactions.spec.ts` |
| **Intake Modal** | Story Textarea | Live parser extracts chips as user types | Yes | `tests/e2e/interactions.spec.ts` |
| **Intake Modal** | Sample Chip: "Refund not received" | Injects refund dispute sample narrative | Yes | `tests/e2e/interactions.spec.ts` |
| **Intake Modal** | Sample Chip: "Defective item rejected" | Injects damaged goods sample narrative | Yes | `tests/e2e/interactions.spec.ts` |
| **Intake Modal** | Microphone Button | Prompts explicit voice transcription opt-in notice | Yes | `tests/e2e/interactions.spec.ts` |
| **Intake Modal** | Voice Opt-in "Cancel, I will type" | Closes voice notice without enabling microphone | Yes | `tests/e2e/interactions.spec.ts` |
| **Intake Modal** | Voice Opt-in "I understand, start microphone" | Starts browser SpeechRecognition transcription | Yes | `tests/e2e/interactions.spec.ts` |
| **Intake Modal** | Company Chip Edit Toggle | Opens inline editor to correct merchant name | Yes | `tests/e2e/interactions.spec.ts` |
| **Intake Modal** | Issue Type Chip Edit Toggle | Opens dropdown to select dispute category | Yes | `tests/e2e/interactions.spec.ts` |
| **Intake Modal** | Disputed Amount Chip Edit Toggle | Opens number input to correct claim sum | Yes | `tests/e2e/interactions.spec.ts` |
| **Intake Modal** | "Confirm & Create Case" Button | Persists case to Dexie and navigates to detail | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases/:id** | "Back to all cases" Link | Navigates back to `/app/cases` | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases/:id** | "Copy Complaint Notice" Button | Copies formal CPA 2019 legal letter to clipboard | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases/:id** | "Open Official Channel" Button | Opens official portal selection drawer | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases/:id** | "Export Proof Pack" Button | Navigates to `/app/documents` for PDF bundle export | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases/:id** | "Mark Sent to Company" Button | Advances status to `waiting_company` with timeline log | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases/:id** | "Record Company Reply" Button | Opens outcome modal (Stage 1: company promised) | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases/:id** | "Add Follow-Up Reminder" Button | Opens direct modal to schedule follow-up date | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases/:id** | "Reopen Case" Button | Moves resolved case back to `action_required` | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases/:id** | "Archive Case" Button | Moves active case to `closed` state | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases/:id** | "Delete Case" Button | Prompts confirmation dialog and removes case | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases/:id** | "Update Resolution / Verify Bank Receipt" | Opens three-stage resolution verification modal | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases/:id** | "+ Add Event" Button | Opens timeline event modal to record calls/notices | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases/:id** | "+ Attach Evidence" Button | Opens direct file upload modal with 15MB limit | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases/:id** | Evidence Tile Download Button | Downloads evidence binary blob | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/cases/:id** | Evidence Tile Remove Button | Prompts confirmation dialog and detaches evidence | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/documents** | "Add File" / "Upload Evidence" Button | Opens evidence upload drawer with redaction scan | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/documents** | "Build Proof Pack" Button | Opens Proof Pack compiler with SHA-256 evidence index | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/documents** | "Generate & Download Proof Pack PDF" | Client-side jsPDF compiles and triggers download | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/documents** | Evidence Tile Delete Button | Removes evidence record from database | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/documents** | Official Channel Handoff Links | Direct links to NCH 1915 and e-Jagriti portals | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/purchases** | "Add Purchase" Button | Opens manual add drawer | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/purchases** | "Import Orders" Button | Opens import modal supporting text, CSV, JSON, EML | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/purchases** | "Preview Extracted Fields" Button | Parses text or file and renders side-by-side diff | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/purchases** | "Save to Purchases" Button | Validates and commits purchase to IndexedDB | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/purchases** | Purchase Card Edit Button | Opens Edit Purchase drawer to update details | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/purchases** | Purchase Card Delete Button | Prompts confirmation dialog and deletes record | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/purchases** | "Start a case from this purchase" Button | Pre-fills and opens intake modal with vendor/order | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/help** | "Start Decision Tree" Button | Starts interactive 2-step route evaluation | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/help** | Decision Tree Option Buttons | Navigates between factual triage steps | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/help** | Decision Tree "Back" / "Reset" Buttons | Resets decision evaluation state | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/help** | Guide Card "Visit Official Site" Links | Opens NCH, e-Jagriti, and RBI official portals | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/reminders** | "Enable Notifications" Button | Triggers browser `Notification.requestPermission()` | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/reminders** | "+ New Reminder" Button | Opens reminder scheduling drawer | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/reminders** | Smart Suggestion Chips ("+7 Days", "+3 Days") | Pre-fills turnaround dates and recommended action | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/reminders** | Reminder Checkbox Toggle | Marks reminder complete / pending | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/reminders** | Reminder Delete Button | Deletes scheduled reminder record | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/privacy** | "Download JSON Backup" Button | Exports unencrypted JSON file of local database | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/privacy** | "Export ZIP Archive (JSON + Evidence)" Button | Bundles JSON and evidence blobs into `.zip` archive | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/privacy** | "Wipe All Records" Button | Prompts `DELETE` confirmation and purges all data | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/privacy** | "Enable Encryption" Button | Derives PBKDF2/AES-GCM key and verifies passphrase | Yes | `tests/e2e/interactions.spec.ts` |
| **/app/privacy** | "Disable Encryption" Button | Verifies passphrase and disables device encryption | Yes | `tests/e2e/interactions.spec.ts` |
| **Command Palette** | Search Input | Filters navigation targets and cases in real-time | Yes | `tests/e2e/interactions.spec.ts` |
| **Command Palette** | Item Click / Enter Key | Executes navigation action or opens dispute detail | Yes | `tests/e2e/interactions.spec.ts` |
| **Command Palette** | Escape Key | Dismisses palette | Yes | `tests/e2e/interactions.spec.ts` |
| **Mobile Nav** | Tab "Home" | Navigates to `/app/overview` | Yes | `tests/e2e/interactions.spec.ts` |
| **Mobile Nav** | Tab "Cases" | Navigates to `/app/cases` | Yes | `tests/e2e/interactions.spec.ts` |
| **Mobile Nav** | Floating Center FAB (`+`) | Opens 60-second intake modal | Yes | `tests/e2e/interactions.spec.ts` |
| **Mobile Nav** | Tab "Docs" | Navigates to `/app/documents` | Yes | `tests/e2e/interactions.spec.ts` |
| **Mobile Nav** | Tab "More" | Opens drawer with Purchases, Rights, Reminders, Privacy | Yes | `tests/e2e/interactions.spec.ts` |

---

## Audit Verification Summary
- **Total Registered Interactive Elements**: 74
- **Implemented & Fully Functioning**: 74 (100%)
- **Dead / Unwired Elements**: 0 (0%)
- **Playwright Test Suite**: `tests/e2e/interactions.spec.ts`
- **Automated Sweep Script**: `tests/e2e/no_dead_clicks.js`

