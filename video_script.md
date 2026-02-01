# 🎬 AI Job Impact Agent - Full Video Script

> **Estimated Duration**: 12-15 minutes  
> **Format**: Site Demo + Codebase Walkthrough (alternating sections)

---

## 📍 SECTION 1: INTRODUCTION (1 minute)

### [SCREEN: Landing Page - localhost:5173]

**SCRIPT:**

> "Hello everyone! Today I'm going to walk you through my project called the **AI Job Impact Agent** - a fully autonomous career search and auto-apply system built for the AI Impact Hackathon twenty-twenty-six.
>
> This is not just another job tracker. This is a **fully autonomous agent** that handles the entire job application pipeline - from intelligent market scanning and persona-based ranking, to tailored artifact generation and verified auto-submission.
>
> What makes this special is the **integrity and verification** mechanisms built into the system. The agent uses LLM-powered ranking, generates personalized resumes and cover letters, but also includes **anti-hallucination grounding verification** to ensure all generated content is factually accurate.
>
> Let me show you how it works."

---

## 📍 SECTION 2: SYSTEM ARCHITECTURE OVERVIEW (2 minutes)

### [SCREEN: README.md or draw architecture diagram]

**SCRIPT:**

> "Before we dive into the demo, let me explain the four-component architecture.
>
> **Component One** - The **Agent Backend** running on port eight thousand. This is the brain of the system, built with **FastAPI**. It handles all the LLM-powered job ranking, resume tailoring, cover letter generation, and the automated batch execution engine.
>
> **Component Two** - The **Agent Dashboard** running on port five-one-seven-three. Built with **React** and **Vite**, this is the control room where users manage their profile, search for jobs, and track applications.
>
> **Component Three** - The **Sandbox Portal API** on port eight-zero-zero-one. This is a mock job board API that simulates the external world - real job portals like LinkedIn or Indeed - so we can safely demonstrate the agent's submission capabilities.
>
> **Component Four** - The **Sandbox Frontend** on port five-one-seven-four. This is the visual job board interface where you can see applications arriving in real-time, and even act as a recruiter responding to candidates.
>
> All four components work in harmony to create a complete autonomous job application ecosystem."

---

## 📍 SECTION 3: PROFILE MANAGEMENT & RESUME UPLOAD (2 minutes)

### [SCREEN: Agent Dashboard - Profile Page - localhost:5173/profile]

**SCRIPT:**

> "Let's start with the first step - setting up the student profile.
>
> Click on the **Profile** tab. Here I can upload my resume as a PDF. The system extracts all the information using the upload endpoint.
>
> **[DEMONSTRATE: Upload a resume PDF]**
>
> Watch what happens - the backend calls the resume parser service to extract structured data. Let me show you the code."

### [SCREEN: Switch to VS Code - backend/app/services/resume_parser.py]

**SCRIPT:**

> "Open the file `resume_parser.py` located at `backend/app/services/resume_parser.py`.
>
> This service uses the LLM client to parse the PDF content and extract structured fields like:
> - Personal information - name, email, phone
> - Education history
> - Skills array
> - Work experience with company names, titles, and dates
> - Projects and certifications
>
> The parsed data is stored in the data store for later use."

### [SCREEN: Switch to VS Code - backend/app/services/profile_extractor.py]

**SCRIPT:**

> "The extracted profile is then processed by `profile_extractor.py` at `backend/app/services/profile_extractor.py`.
>
> This file has a method called `extract_profile_from_resume` that takes the raw resume text and uses our LLM client - specifically **Groq's Llama three-point-one-eight-b-instant model** - to generate a structured JSON profile.
>
> Notice the prompt engineering here. We're asking the model to return valid JSON with specific fields. Temperature is set low at zero-point-three for deterministic output."

---

## 📍 SECTION 4: ARTIFACT PACK GENERATION (2 minutes)

### [SCREEN: Agent Dashboard - Artifact Pack Page]

**SCRIPT:**

> "Now comes the exciting part - generating the **Artifact Pack**. This is a collection of pre-generated assets that the agent uses during job applications.
>
> Click on **Artifact Pack**. Here we have three generation buttons:
> 
> **One - Generate Bullets**: Creates a library of achievement-focused bullet points from my experience.
>
> **Two - Generate Answer Library**: Pre-generates answers to common application questions like 'Why do you want to work here?' or 'What's your availability?'
>
> **Three - Build Proof Pack**: Creates a verified knowledge base of career evidence.
>
> **[DEMONSTRATE: Click Generate Bullets]**
>
> Let me show you the code behind bullet generation."

### [SCREEN: Switch to VS Code - backend/app/services/bullet_generator.py]

**SCRIPT:**

> "Open `bullet_generator.py` at `backend/app/services/bullet_generator.py`.
>
> This service takes each experience entry from my profile and generates multiple variations of achievement-focused bullet points. The key here is the prompt - we're asking for **quantifiable achievements** with the **STAR format** - Situation, Task, Action, Result.
>
> Each bullet is tagged with relevant skills and stored in the bullet bank for later retrieval during resume tailoring."

### [SCREEN: Switch to VS Code - backend/app/services/proof_pack.py]

**SCRIPT:**

> "Next, look at `proof_pack.py` at `backend/app/services/proof_pack.py`.
>
> The Proof Pack is a collection of **verified evidence** items. Each item links a claim to actual source data from my resume. This is crucial for the grounding verification later - when the agent generates a cover letter, it can only use claims that are backed by evidence in the Proof Pack."

---

## 📍 SECTION 5: JOB SEARCH & INTELLIGENT RANKING (2 minutes)

### [SCREEN: Agent Dashboard - Job Search Page]

**SCRIPT:**

> "Now let's search for jobs. Click on **Job Search**.
>
> I can search using keywords, filter by job type, experience level, and whether I want remote positions. The system fetches jobs from our Sandbox Portal.
>
> **[DEMONSTRATE: Enter search query 'Software Engineer', click Search]**
>
> Look at the results - each job has a **Match Score**. This isn't a simple keyword match. The agent uses LLM-powered semantic analysis."

### [SCREEN: Switch to VS Code - backend/app/services/job_ranker.py]

**SCRIPT:**

> "Open `job_ranker.py` at `backend/app/services/job_ranker.py`.
>
> The ranking uses a **weighted multi-factor scoring system**:
>
> - **Skills Score** with forty percent weight - calculated by the function `calculate_skill_score` which checks how many job-required skills match my profile.
>
> - **Experience Score** with thirty percent weight - the function `calculate_experience_score` compares the job's experience level like 'entry', 'mid', or 'senior' against my years of experience.
>
> - **Constraint Score** with thirty percent weight - `calculate_constraint_score` checks preferences like remote-only, visa sponsorship, and preferred locations.
>
> The final score is a weighted sum. Jobs are sorted descending by match score.
>
> For the **top five jobs**, we also call `generate_match_reasoning` which uses the LLM to explain WHY the job is a good match. This adds transparency to the ranking."

---

## 📍 SECTION 6: APPLY QUEUE MANAGEMENT (1.5 minutes)

### [SCREEN: Agent Dashboard - Apply Queue Page]

**SCRIPT:**

> "After searching and ranking, I can add high-scoring jobs to the **Apply Queue**.
>
> Click on **Apply Queue**. This shows all jobs queued for automated application. I can:
> - View the match score breakdown
> - See the AI-generated reasoning
> - Reorder jobs by priority
> - Remove jobs I no longer want
>
> **[DEMONSTRATE: Show some queued jobs with their scores]**
>
> The queue is stored in JSON format for persistence. Let me show you the data file."

### [SCREEN: Switch to VS Code - backend/data/apply_queue.json or job_ranker.py functions]

**SCRIPT:**

> "Back in `job_ranker.py`, look at the functions `add_to_apply_queue`, `get_queued_jobs`, `remove_queued_job`, and `reorder_queue`.
>
> These manage the queue with thread-safe locking using Python's `threading.RLock`. The queue is deduplicated against historical applications - we never apply twice to the same job.
>
> Queue data persists in `apply_queue.json` inside the `data` directory."

---

## 📍 SECTION 7: APPLICATION POLICY & SAFETY CONTROLS (1.5 minutes)

### [SCREEN: Agent Dashboard - Apply Queue Page (Policy Settings section)]

**SCRIPT:**

> "Before running autonomous applications, we need **safety guardrails**. Look at the Policy Settings section.
>
> We have:
> - **Daily Limit**: Maximum applications per day. Set to zero for unlimited.
> - **Minimum Match Score**: Only apply to jobs above this threshold.
> - **Blocked Companies**: A list of companies to never apply to.
> - **Global Pause**: A kill switch to stop all automated applications.
> - **Remote Only**: Enforce only remote job applications."

### [SCREEN: Switch to VS Code - backend/app/services/apply_policy.py]

**SCRIPT:**

> "Open `apply_policy.py` at `backend/app/services/apply_policy.py`.
>
> This is the policy enforcement layer. The key function is `check_application_policy` which runs BEFORE every application.
>
> It checks:
> 1. **Global Kill Switch** - Is the system paused?
> 2. **Blocked Companies** - Is this company blacklisted?
> 3. **Minimum Match Score** - Does the job meet the threshold?
> 4. **Remote Only** - If enforced, is the job remote?
> 5. **Daily Limit** - Have we hit today's quota?
>
> If any check fails, the application is blocked and logged. This is critical for **responsible automation** - we don't want the agent to spam applications recklessly."

---

## 📍 SECTION 8: AUTONOMOUS BATCH PROCESSING (2 minutes)

### [SCREEN: Agent Dashboard - Apply Queue Page - Batch Processor section]

**SCRIPT:**

> "Now the core feature - **Autonomous Batch Processing**. Click **Start Batch**.
>
> **[DEMONSTRATE: Click Start Batch and watch logs appear]**
>
> Watch the real-time logs. The agent is processing each job in the queue. For each job, it:
> 1. Checks the policy
> 2. Assembles the application package
> 3. Submits to the Sandbox Portal
>
> Let me show you the engine code."

### [SCREEN: Switch to VS Code - backend/app/services/batch_processor.py]

**SCRIPT:**

> "Open `batch_processor.py` at `backend/app/services/batch_processor.py`.
>
> This is the heart of autonomous execution. Look at the `BatchState` class - it tracks:
> - `is_running`: Whether the batch is active
> - `stop_requested`: For the kill switch
> - `processed_count`, `success_count`, `failed_count`: Statistics
> - `logs`: Real-time execution logs
>
> The `_worker` function runs in a background thread. For each job:
> 
> 1. **Deduplication Check** - Skip if already applied
> 2. **Policy Check** - Call `check_application_policy`
> 3. **Retry Loop** - Up to five attempts per job with exponential backoff
> 4. **Package Assembly** - Call `assemble_application_package` 
> 5. **Submission** - Call `submit_application`
>
> Notice the use of `asyncio.new_event_loop()` since we're in a separate thread. Rate limiting is built in with `time.sleep` between jobs."

### [SCREEN: Switch to VS Code - backend/app/services/application_assembler.py]

**SCRIPT:**

> "The assembly happens in `application_assembler.py`. The function `assemble_application_package` gathers:
> - A snapshot of the student profile
> - A **tailored resume** using the resume tailor service
> - A **personalized cover letter** using the cover letter service
> - Answers from the answer library
>
> Everything is packaged together and stored before submission."

---

## 📍 SECTION 9: COVER LETTER GENERATION WITH GROUNDING (2 minutes)

### [SCREEN: Show a generated cover letter in the UI or API response]

**SCRIPT:**

> "Let's look at how cover letters are generated. Each one is completely personalized to the job.
>
> **[DEMONSTRATE: Show a sample cover letter text]**
>
> Notice - it mentions the specific company name, the job title, relevant skills from MY resume, and concrete achievements. This isn't template-based - it's AI-generated."

### [SCREEN: Switch to VS Code - backend/app/services/cover_letter.py]

**SCRIPT:**

> "Open `cover_letter.py` at `backend/app/services/cover_letter.py`.
>
> This is a three hundred-plus line service. The `generate_cover_letter` function builds a detailed prompt with:
> - Complete job information - title, company, description, requirements
> - Full candidate resume text
> - Relevant achievement bullets from the bullet bank
> - Proof items from the proof pack
> - Availability information from the answer library
>
> The prompt has **strict writing rules**: exactly three paragraphs, must mention the company name at least twice, must end with the candidate's real name - never placeholders.
>
> But here's the critical part..."

### [SCREEN: Switch to VS Code - backend/app/services/grounding_verifier.py]

**SCRIPT:**

> "After generation, every cover letter goes through `grounding_verifier.py` at `backend/app/services/grounding_verifier.py`.
>
> The function `verify_content` is our **anti-hallucination** layer. It takes the generated text and the student's evidence profile, then uses another LLM call to verify:
>
> - Are specific claims supported by evidence?
> - Are there any invented metrics or skills?
> - Every company name and number must be traceable to the real resume.
>
> If the grounding score falls below the threshold of seventy, the content is flagged. Any **hallucinations** found are listed in the response.
>
> This ensures the agent never claims skills or experiences the student doesn't actually have. This is **responsible AI** in action."

---

## 📍 SECTION 10: AUTO-SUBMIT TO SANDBOX PORTAL (1.5 minutes)

### [SCREEN: Switch to Sandbox Frontend - localhost:5174]

**SCRIPT:**

> "Let's see where applications land. Switch to the **Sandbox Frontend** at localhost five-one-seven-four.
>
> **[DEMONSTRATE: Show applications list]**
>
> Here we can see all submitted applications in real-time. Click on one to see the full details - applicant name, email, resume text, cover letter.
>
> As a recruiter, I can:
> - **Update status** to accepted, rejected, or interviewing
> - **Send messages** to the candidate
> - **Schedule interviews**"

### [SCREEN: Switch to VS Code - backend/app/services/auto_submit.py]

**SCRIPT:**

> "Open `auto_submit.py` at `backend/app/services/auto_submit.py`.
>
> The function `submit_application` uses `httpx.AsyncClient` to POST the application to the Sandbox Portal. It includes:
> - Retry logic with up to three attempts
> - Exponential backoff on rate limiting (HTTP 429)
> - Proper error handling for server errors
>
> The Sandbox URL is configured to `localhost:8001`. Headers include the API key for authentication.
>
> After submission, the status updates to 'submitted' and the receipt is stored."

---

## 📍 SECTION 11: APPLICATION TRACKER & FEEDBACK LOOP (1 minute)

### [SCREEN: Agent Dashboard - Tracker Page]

**SCRIPT:**

> "Back to the Agent Dashboard - click on **Tracker**.
>
> This shows all applications with their current status:
> - Submitted
> - Interviewing  
> - Accepted
> - Rejected
>
> The summary bar shows success rate, total count, and status breakdown.
>
> Click on any application to see:
> - The original job details
> - Generated cover letter
> - Submission receipt
> - **Recruiter feedback** from the Sandbox Portal! If the recruiter sent messages or scheduled interviews, you see it here."

### [SCREEN: Switch to VS Code - backend/app/services/tracker.py]

**SCRIPT:**

> "Open `tracker.py` at `backend/app/services/tracker.py`.
>
> The `get_tracker_summary` function calculates statistics by iterating through all applications:
> - Status breakdown counts
> - Success rate computation
> - Recent activity feed
>
> The `retry_application` function allows re-submitting failed applications - useful if there was a temporary network error."

---

## 📍 SECTION 12: LLM CLIENT & API KEY ROTATION (1 minute)

### [SCREEN: Switch to VS Code - backend/app/services/llm_client.py]

**SCRIPT:**

> "One technical highlight - open `llm_client.py` at `backend/app/services/llm_client.py`.
>
> We use **Groq's API** for fast LLM inference with the **Llama three-point-one-eight-b-instant** model.
>
> The clever part is the **API key rotation** system. We support up to ten API keys configured as `GROQ_API_KEY_1` through `GROQ_API_KEY_10` in the environment file.
>
> The function `_make_request` cycles through all keys aggressively. If one key is rate limited, it moves to the next. If all keys fail, it waits and retries full cycles. This maximizes throughput during batch processing.
>
> The `generate_text` function is the main interface, and `generate_json` is a specialized version with lower temperature for structured output."

---

## 📍 SECTION 13: FRONTEND API INTEGRATION (30 seconds)

### [SCREEN: Switch to VS Code - frontend/src/services/api.ts]

**SCRIPT:**

> "Finally, let's look at the frontend integration. Open `api.ts` at `frontend/src/services/api.ts`.
>
> This TypeScript file defines all the API calls using Axios:
> - Profile management: `getProfile`, `saveProfile`, `uploadResume`
> - Job operations: `searchJobs`, `rankJobs`, `addToQueue`
> - Batch processing: `startBatchProcessing`, `stopBatchProcessing`, `getBatchStatus`
> - Tracker: `getTrackerSummary`, `getSandboxFeedback`
>
> All endpoints are typed with TypeScript interfaces for type safety."

---

## 📍 SECTION 14: CONCLUSION & SUMMARY (1 minute)

**SCRIPT:**

> "And that's the **AI Job Impact Agent**!
>
> We've seen how it processes resumes, builds a technical artifact pack, ranks jobs with semantic intelligence, enforces safety policies, and runs a fully autonomous loop with grounding verification to prevent hallucinations.
>
> This project demonstrates that AI agents can be powerful tools for personal productivity when built with **integrity, transparency, and robust safety guardrails**.
>
> Thank you for watching my demo! If you're interested in the code, check the repo links below. Happy job hunting!"

---

## 📽️ RECORDING TIPS FOR THE USER

1.  **Preparation**:
    - Ensure all servers are running (`backend`, `frontend`, `sandbox-portal`, `sandbox-frontend`).
    - Use a high-quality microphone.
    - Set screen resolution to 1080p for clear text.
    - Zoom into VS Code (Ctrl + +) so the code is readable on video.

2.  **Visual Setup**:
    - Have a "Fake Resume" ready to upload for the demo.
    - Seed the Sandbox Portal with some jobs before starting.
    - Use a browser with dark mode enabled for a "premium" look.

3.  **Transition Flow**:
    - When moving from Site to Code, use a smooth "sliding" transition in your editing software.
    - Highlight lines of code in VS Code using your mouse cursor while speaking about them.

4.  **Hardware/Software Used**:
    - **LLM**: Groq (Llama 3.1 8b/70b)
    - **Backend**: FastAPI, Pydantic, Httpx, Threading
    - **Frontend**: React, Vite, Tailwind CSS (or Vanilla CSS), Axios
    - **Database**: JSON-based Flat File Store (for demo portability)
    - **Language**: Python 3.10+, TypeScript

---

## 📁 KEY FILES REFERENCE

| Component | File Path | Purpose |
|-----------|-----------|---------|
| LLM Client | `backend/app/services/llm_client.py` | Groq API integration with key rotation |
| Profile Extractor | `backend/app/services/profile_extractor.py` | Resume parsing to structured profile |
| Bullet Generator | `backend/app/services/bullet_generator.py` | Achievement-focused bullet generation |
| Job Ranker | `backend/app/services/job_ranker.py` | Multi-factor match scoring |
| Apply Policy | `backend/app/services/apply_policy.py` | Safety guardrails and kill switch |
| Batch Processor | `backend/app/services/batch_processor.py` | Autonomous execution engine |
| Cover Letter | `backend/app/services/cover_letter.py` | Personalized cover letter generation |
| Grounding Verifier | `backend/app/services/grounding_verifier.py` | Anti-hallucination verification |
| Auto Submit | `backend/app/services/auto_submit.py` | HTTP submission to portal |
| Tracker | `backend/app/services/tracker.py` | Application status management |
| Sandbox Portal | `sandbox-portal/main.py` | Mock job board API |
| Frontend API | `frontend/src/services/api.ts` | React API client |

---

## 🎯 DEMO CHECKLIST

- [ ] Start all 4 services.
- [ ] Profile: Upload PDF → Show extraction.
- [ ] Artifacts: Click 'Generate' → Show resulting cards/data.
- [ ] Search: Query 'Full Stack' → Point out Match Scores.
- [ ] Queue: Add jobs → Show AI Reasoning.
- [ ] Policy: Change 'Daily Limit' or 'Threshold'.
- [ ] Batch: Start → Point out log messages.
- [ ] Sandbox: Show application landing → Show recruiter controls.
- [ ] Tracker: Show updated status.
- [ ] Code deep dive: Show `llm_client.py` and `grounding_verifier.py`.
