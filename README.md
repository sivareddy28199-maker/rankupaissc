# Rankup Ai

Create a new project with Supabase enabled.

RANKUP AI — MASTER BUILD PROMPT

You are the lead full-stack engineer, product architect, UI/UX designer, database engineer, AI engineer, QA engineer, and DevOps engineer for this project.

Your task is to build RankUp AI, a fully functional, production-ready, mobile-first AI learning platform for competitive-exam students.

Do NOT create a static demo.

Do NOT create fake buttons.

Do NOT create placeholder functionality when real functionality can be implemented.

Build the application incrementally through the three phases below, verify each phase, fix errors, and continue until the complete application is functional.

1. PRODUCT VISION

Product Name

RankUp AI

Target Users

Students preparing for:

SSC CGL

CUET PG / MBA entrance

Other competitive examinations in the future

Core Goal

RankUp AI should combine:

AI-powered learning

Mock tests

Personalized study planning

Revision

Progress analytics

AI doubt solving

AI notes generation

AI question generation

The architecture must allow additional exams and AI providers to be added later without rewriting the application.

2. NON-NEGOTIABLE DEVELOPMENT RULES

Follow these rules throughout the entire project.

Rule 1 — Real functionality

Every major button must perform an actual action.

Examples:

Start Test → actually starts a test

Submit Test → calculates score

Save Note → saves to database

Ask AI → calls the configured AI provider

Add Question → inserts a question into the database

Update Profile → updates the user profile

Continue Test → restores test state

Never create dead UI.

Rule 2 — Database first

Do not store important application data only in frontend state.

Persist important data in Supabase.

Rule 3 — Secure architecture

Never expose:

Supabase service-role keys

AI provider secret keys

administrative credentials

private server credentials

in client-side code.

Use secure server-side/API routes where required.

Rule 4 — AI provider abstraction

Do NOT tightly couple the application to Ox Alpha.

Create an AI provider abstraction:

AI Provider Interface
        ↓
Ox Alpha Provider
        ↓
Future Providers


The application should call:

generateText()
generateQuestions()
generateExplanation()
generateStudyPlan()
solveDoubt()


through the abstraction layer.

This allows Ox Alpha to be replaced later without rewriting RankUp AI.

Rule 5 — Free-first architecture

Initially design the application to operate using free tiers wherever realistically possible.

Avoid unnecessary paid infrastructure.

However, never compromise security or architecture merely to remain free.

Rule 6 — Mobile-first

The primary target is smartphones.

The application must also work properly on:

tablets

laptops

desktop screens

Rule 7 — No unnecessary complexity

Prefer simple, maintainable architecture.

Do not install unnecessary libraries.

3. RECOMMENDED TECH STACK

Use:

Next.js

TypeScript

React

Tailwind CSS

Supabase

PostgreSQL

Supabase Auth

Server/API routes for protected operations

Ox Alpha or configured AI provider

GitHub-ready project structure

Vercel-compatible deployment

Use modern stable versions compatible with the environment.

If the environment already contains a working project, inspect it first and preserve useful existing functionality instead of unnecessarily rebuilding everything.

PHASE 1 — ₹0 CORE MVP

Build the complete non-AI learning platform first.

Do not begin with AI.

The application must be usable even if the AI provider is completely unavailable.

4. AUTHENTICATION

Implement:

Sign up

Sign in

Sign out

Forgot password

Password reset

Session persistence

Protected routes

User profile creation

Support:

Email/password authentication

Structure the authentication system so Google authentication can be added later.

After registration, automatically create the user's profile record.

5. USER PROFILE

Create a profile system containing:

Full name

Email

Avatar

Target examination

Target year

Study level

Daily study target

Preferred subjects

Current streak

Total tests

Total questions attempted

Average score

Allow the user to edit their profile.

6. MAIN APPLICATION NAVIGATION

Create a clean mobile-first navigation system.

Primary sections:

Home
Practice
Tests
Revision
AI Coach
Progress
Profile


Use a professional education-app visual language.

Avoid excessive gradients, animations, and visual clutter.

7. HOME DASHBOARD

Create a functional dashboard showing:

Welcome section

Example:

"Good morning, Shiva."

Do not hard-code the user's name. Read it from the profile.

Today's mission

Display:

Daily question target

Completed questions

Remaining questions

Study target

Current streak

Quick actions

Start Practice

Take Mock Test

Ask AI

Revise

Performance summary

Display:

Accuracy

Questions attempted

Tests completed

Average score

Current streak

All statistics must come from real database data.

8. SUBJECT SYSTEM

Create an expandable subject architecture.

Initial SSC CGL subjects:

Quantitative Aptitude

Topics should support categories such as:

Number System

Percentage

Ratio & Proportion

Average

Profit & Loss

Simple Interest

Compound Interest

Time & Work

Time, Speed & Distance

Algebra

Geometry

Mensuration

Trigonometry

Data Interpretation

Reasoning

Include:

Analogy

Classification

Series

Coding-Decoding

Blood Relations

Direction Sense

Ranking

Syllogism

Venn Diagrams

Statement & Conclusion

Mathematical Operations

Non-verbal Reasoning

English

Include:

Vocabulary

Grammar

Error Detection

Sentence Improvement

Fill in the Blanks

Synonyms

Antonyms

Idioms

One Word Substitution

Reading Comprehension

General Awareness

Include:

History

Geography

Polity

Economics

General Science

Static GK

Current Affairs

Design the database so additional examinations and subjects can be added without modifying the core architecture.

9. QUESTION DATABASE

Create a proper question model.

Each question should support:

ID

Exam

Subject

Topic

Question text

Question type

Options

Correct answer

Explanation

Difficulty

Source

Year

Tags

Created date

Updated date

Question types should support:

MCQ

True/False

Fill in the blank

Prepare the architecture for additional types later.

10. PRACTICE ENGINE

Implement:

Subject practice

Topic practice

Difficulty selection

Number of questions

Instant answer feedback

Explanation

Accuracy tracking

Attempt history

Record every attempt.

Store:

user

question

selected answer

correct answer

time taken

result

timestamp

11. MOCK TEST ENGINE

Create:

Test types

Topic Test

Subject Test

Sectional Test

Full Mock Test

Each test must support:

Timer

Question navigation

Previous/Next

Question palette

Mark for review

Skip

Answer selection

Auto-save

Submit test

Automatic score calculation

Default SSC-style scoring should support configurable:

Correct = +2
Wrong = -0.5
Skipped = 0


Do not hard-code these values into the engine.

Store exam-specific scoring rules in configuration/database.

12. TEST RESULT PAGE

After submission show:

Score

Maximum marks

Percentage

Correct

Wrong

Skipped

Accuracy

Time used

Subject-wise performance

Topic-wise weaknesses

Also provide:

Review answers

Explanations

Retry test

Practice weak topics

13. PROGRESS ANALYTICS

Create a functional analytics dashboard.

Show:

Daily questions

Weekly activity

Monthly activity

Accuracy trend

Test score trend

Subject performance

Weak topics

Strong topics

Study streak

Total study time

Use real database records.

Do not use fake chart data.

14. REVISION ENGINE

Implement a basic revision system.

Users should be able to save:

Questions

Topics

Notes

Create:

Saved Questions

Users can bookmark difficult questions.

Revision Queue

Display questions requiring revision.

Prepare the architecture for spaced repetition.

Store:

Last reviewed

Review count

Difficulty

Next review date

15. ADMIN SYSTEM

Create an admin architecture.

Admin users should eventually be able to:

Create questions

Edit questions

Delete questions

Create subjects

Create topics

Create tests

View users

View platform statistics

Implement role-based access.

Normal users must never access admin functionality.

16. DATABASE

Design a normalized Supabase PostgreSQL schema.

At minimum consider tables for:

profiles
exams
subjects
topics
questions
question_options
tests
test_questions
test_attempts
test_answers
practice_sessions
practice_answers
bookmarks
revision_items
study_sessions
daily_goals
user_progress
ai_conversations
ai_messages
ai_generations


Add appropriate:

Primary keys

Foreign keys

Indexes

Unique constraints

Timestamps

Use UUIDs where appropriate.

17. ROW LEVEL SECURITY

Implement Supabase Row Level Security properly.

Users should only be able to access their own private data.

Examples:

A user can read/update their own profile.

A user can read their own:

attempts

progress

bookmarks

revision items

study sessions

AI conversations

Users must not be able to modify another user's records.

Admin access must use proper role-based policies.

Do not disable RLS simply to make the application work.

PHASE 2 — AI LEARNING ENGINE

Once Phase 1 is stable and tested, implement the AI layer.

18. AI PROVIDER ARCHITECTURE

Create:

/lib/ai
    provider.ts
    oxalpha.ts
    prompts.ts
    types.ts


Define a provider interface.

Example capabilities:

askTutor()
solveDoubt()
generateNotes()
generateQuestions()
generateQuiz()
generateStudyPlan()
explainAnswer()
analyzePerformance()


Ox Alpha should implement this interface initially.

If Ox Alpha is unavailable, the application should return a controlled error rather than crash.

19. AI COACH

Create a personalized AI Coach.

The AI Coach should use:

User profile

Target exam

Target date

Recent performance

Weak subjects

Weak topics

Study history

Test scores

Revision history

Generate:

Daily plan

Example:

Today's Priority

1. Percentage — 30 min
2. Reasoning Series — 25 min
3. English Error Detection — 20 min
4. Revision — 15 min


The plan must be personalized from real data.

20. AI DOUBT SOLVER

Create a chat interface.

Users can ask questions.

AI should:

Understand the question.

Explain the concept.

Show step-by-step reasoning where appropriate.

Give the final answer.

Give a shortcut where useful.

Provide one or two similar practice questions.

Keep explanations appropriate for competitive-exam preparation.

Store conversation history.

21. AI NOTES MAKER

Allow users to enter:

Topic

Difficulty

Exam

Generate structured notes containing:

Simple definition

Important concepts

Formulas

Examples

Common mistakes

Shortcuts

Quick revision section

Practice questions

Allow:

Save

Edit

Delete

Regenerate

Saved notes should persist in the database.

22. AI QUESTION GENERATOR

Allow users to specify:

Exam

Subject

Topic

Difficulty

Number of questions

Generate MCQs with:

Question

Four options

Correct answer

Explanation

Difficulty

Topic

Validate generated output before saving it.

Never blindly trust AI-generated structured data.

23. AI PERFORMANCE ANALYSIS

After tests, allow AI to analyze performance.

It should identify:

Weak topics

Strong topics

Accuracy problems

Time-management problems

Repeated mistakes

Then generate actionable recommendations.

Example:

Your Geometry accuracy is 48%.

Priority:
1. Revise triangles.
2. Practice 20 geometry questions.
3. Take a topic test tomorrow.


Recommendations must be based on actual user data.

24. AI STUDY PLAN

Create a study-plan generator.

Inputs:

Exam

Target date

Current level

Daily available time

Subjects

Weak topics

Generate:

Long-term plan

Weekly plan

Daily tasks

Revision schedule

Mock-test schedule

Save generated plans.

Allow regeneration.

PHASE 3 — PRODUCTION / SCALE SYSTEM

After Phase 2 works correctly, implement the production layer.

25. PERFORMANCE

Optimize:

Database queries

API calls

AI requests

Client rendering

Image loading

Bundle size

Use caching where appropriate.

Do not call AI unnecessarily.

Cache reusable AI-generated content where practical.

26. AI COST CONTROL

Build a usage system.

Track:

AI requests

Tokens where available

User usage

Daily usage

Monthly usage

Create configurable limits.

Example:

Free User
10 AI requests/day

Premium User
Higher configurable limit


Do not hard-code these limits.

Make them configurable.

27. AI FALLBACK SYSTEM

Design:

Primary AI
     ↓
Failure?
     ↓
Fallback AI
     ↓
Failure?
     ↓
Friendly error


Do not let an AI provider outage break the application.

28. PREMIUM ARCHITECTURE

Prepare premium functionality.

Potential premium features:

Higher AI limits

Advanced AI Coach

Advanced analytics

Unlimited mock tests

Personalized study plans

Advanced revision

Premium notes

Performance reports

Implement feature flags so premium features can be enabled/disabled.

Do not implement payment processing until the core product is stable.

29. NOTIFICATION SYSTEM

Prepare architecture for:

Daily study reminders

Test reminders

Revision reminders

Streak reminders

AI Coach missions

Keep notification providers replaceable.

30. ADMIN DASHBOARD

Create a production admin dashboard showing:

Total users

Active users

Questions

Tests

Attempts

Average scores

AI usage

Most difficult topics

Most attempted subjects

Add content-management capabilities.

31. SECURITY AUDIT

Before considering the project complete, inspect the entire application for:

Exposed secrets

Unsafe API routes

Broken authentication

Broken authorization

Missing RLS

SQL injection risks

XSS risks

Improper input validation

Unsafe AI output handling

Admin privilege escalation

Client-side secret exposure

Fix every issue you find.

32. ERROR HANDLING

Every major system must have:

Loading states

Empty states

Error states

Retry actions

Form validation

Network failure handling

Never show raw technical errors to normal users.

33. UX REQUIREMENTS

The interface should feel like a serious education application.

Design principles:

Clean

Minimal

Fast

Mobile-first

Professional

Accessible

Easy navigation

Use consistent:

Typography

Spacing

Cards

Buttons

Icons

Colors

Feedback states

Avoid unnecessary visual effects.

34. ACCESSIBILITY

Implement:

Keyboard navigation

Proper labels

Semantic HTML

Accessible buttons

Sufficient contrast

Screen-reader-friendly controls

Visible focus states

35. RESPONSIVE DESIGN

Test at minimum:

360px
390px
430px
768px
1024px
1440px


Nothing should overflow horizontally.

36. SEED DATA

Create realistic seed data.

Include:

SSC CGL

Subjects

Topics

Sample questions

Sample tests

Do NOT use fake analytics for logged-in users.

Seed data is acceptable for questions/tests, but user analytics must come from actual user actions.

37. TESTING

Before declaring completion, test:

Authentication

Registration

Login

Logout

Password reset

Session persistence

Database

CRUD operations

RLS

User isolation

Practice

Question loading

Answer selection

Scoring

History

Mock Tests

Timer

Navigation

Auto-save

Submission

Score calculation

Result analysis

AI

AI request

AI response

Error handling

Invalid AI output

Usage tracking

Conversation persistence

Admin

Role protection

Question CRUD

User isolation

Responsive UI

Test mobile, tablet and desktop.

38. BUILD QUALITY GATE

Do not say:

"Project complete"

until you have verified:

Application builds successfully

No TypeScript errors

No obvious runtime errors

Database schema works

Authentication works

RLS works

Mock tests work

Practice works

Progress tracking works

AI integration works

Admin protection works

Mobile UI works

Production build succeeds

If something fails, diagnose and fix it before continuing.

39. ENVIRONMENT VARIABLES

Create a clear .env.example.

Never put real secrets inside source code.

Expected categories may include:

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OX_ALPHA_API_KEY
OX_ALPHA_BASE_URL
AI_MODEL


Only expose variables prefixed with NEXT_PUBLIC_ when they are genuinely safe for client-side exposure.

40. PROJECT STRUCTURE

Use a maintainable structure similar to:

app/
components/
lib/
lib/ai/
lib/supabase/
hooks/
types/
utils/
services/
supabase/
    migrations/
    seed/
public/


Adapt the exact structure to the framework version and environment.

41. DEVELOPMENT WORKFLOW

Follow this exact sequence.

STEP 1

Inspect the existing environment/project.

Do not overwrite useful existing work.

STEP 2

Create/fix the project architecture.

STEP 3

Implement Phase 1.

STEP 4

Run/build/test Phase 1.

STEP 5

Fix all Phase 1 errors.

STEP 6

Implement Phase 2.

STEP 7

Run/build/test Phase 2.

STEP 8

Fix all Phase 2 errors.

STEP 9

Implement Phase 3.

STEP 10

Run a complete production audit.

STEP 11

Fix all remaining issues.

STEP 12

Provide a concise final report containing:

PHASE 1
Completed:
Remaining:

PHASE 2
Completed:
Remaining:

PHASE 3
Completed:
Remaining:

DATABASE
Tables:
RLS:
Seed data:

AI
Provider:
Model:
API status:

DEPLOYMENT
Build:
Environment variables:
Deployment readiness:

KNOWN LIMITATIONS
...


42. IMPORTANT — DO NOT CHEAT

Do NOT:

Build only the frontend

Create fake AI responses

Hard-code dashboard statistics

Fake authentication

Store important data only in localStorage

Disable RLS

Expose API keys

Create fake loading animations instead of functionality

Claim something works without testing it

Remove features because they are difficult

Replace database functionality with mock JSON

Create placeholder buttons

If a feature cannot currently be completed because an external credential/service is unavailable, implement the architecture correctly and clearly identify the missing configuration.

43. FINAL PRODUCT STANDARD

The final result should behave like a real learning platform, not a prototype.

A new student should be able to:

Sign up
   ↓
Create profile
   ↓
Select SSC CGL
   ↓
See dashboard
   ↓
Practice questions
   ↓
Take mock test
   ↓
Receive score
   ↓
See weaknesses
   ↓
Revise weak topics
   ↓
Ask AI
   ↓
Generate notes
   ↓
Generate practice questions
   ↓
Receive personalized study plan
   ↓
Track progress


Everything above must use real application logic and persistent data.

44. START NOW

Do not merely explain how you would build RankUp AI.

Build it.

First inspect the existing project/environment.

Then implement Phase 1 completely.

After Phase 1 passes its quality checks, implement Phase 2.

After Phase 2 passes, implement Phase 3.

Do not stop after creating the UI.

Do not wait for unnecessary confirmation between phases.

Make reasonable engineering decisions yourself.

If credentials are required, create the correct integration and clearly identify exactly which environment variables I need to provide.

The final objective is:

A fully functional, secure, scalable, mobile-first RankUp AI web application that can start on free infrastructure and later scale into a commercial product without requiring a complete rewrite.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/38268d0d-3d03-4059-b2f7-0358c8b578f1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
