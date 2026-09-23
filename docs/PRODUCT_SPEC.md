# Product Specification — MVP

**Status:** Approved baseline with operational details pending
**Last updated:** 2026-09-23
**Working name:** Siyana Maths (brand/domain confirmation pending)

## 1. Product purpose

Siyana Maths is a public web platform for a Sri Lankan mathematics tutoring business. It centralizes O/L Mathematics past-paper questions, Sinhala solutions, detailed marking schemes, and the tutor's existing YouTube, TikTok, and Facebook discussions.

The first release is a focused publishing and learning-access platform. It is not a student portal.

## 2. MVP goals

1. Let students discover the latest O/L Mathematics past-paper discussions without creating an account.
2. Present each question, Sinhala solution, and full marking scheme in a readable mobile-friendly page.
3. Let students watch an embedded provider video when possible and always provide a direct source link.
4. Let the tutor create, edit, preview, publish, archive, and manage paper content through a protected admin area.
5. Provide direct contact paths through WhatsApp, phone, email, and social profiles, plus a stored website contact form.
6. Deploy the frontend to Vercel, the API to Render, and data/authentication to Supabase.

## 3. Initial content rollout

- Start with the latest/most recent O/L Mathematics paper.
- Add older O/L Mathematics papers after the first workflow is tested.
- Add other subjects, grade levels, and lesson-based teaching later.
- Do not design the first release around student progress, quizzes, payments, or a course portal.

The exact exam year, medium, and paper set are confirmed when the first seed paper is entered.

## 4. Users

### Public student

Needs to:

- browse papers on a phone or desktop;
- filter by year, subject, paper, and medium;
- read a question and its Sinhala solution;
- understand the full marking scheme;
- watch or open external videos;
- contact the tutor.

### Tutor/admin

Needs to:

- sign in securely;
- create and edit a paper;
- add ordered questions and mark values;
- write Sinhala solutions;
- add ordered marking-scheme items with method/award notes and mark values;
- attach videos to a paper or an individual question;
- preview the public page;
- publish, unpublish, archive, and delete content;
- review contact submissions.

### Future student account

Explicitly deferred. It may later support bookmarks, progress, quizzes, or personalized recommendations. It is not part of MVP acceptance.

## 5. MVP scope

### Public experience

- Home page with tutor introduction and latest/featured papers.
- O/L Mathematics paper catalog.
- Filters for exam year, paper number, medium, and subject (subject defaults to Mathematics).
- Search across paper titles, descriptions, and topics.
- Paper detail page with ordered questions.
- Sinhala answer/solution for every published question.
- Full marking-scheme section with ordered steps, method/award notes, and mark values.
- Paper-level and question-level video sources.
- Provider embed where possible plus an always-visible original link.
- About page.
- Contact page with WhatsApp, phone, email, social links, and website form.
- Basic SEO metadata, canonical URLs, sitemap, and robots configuration.

### Admin experience

- Supabase-backed admin authentication.
- Paper list with status and search/filter.
- Create/edit form for standard paper metadata.
- Repeatable ordered question editor.
- Repeatable Sinhala solution editor.
- Repeatable marking-scheme editor.
- Paper-level and question-level video source editor.
- Preview before publishing.
- Publish/archive/delete confirmation flows.
- Contact-submission review.

## 6. Content and language rules

- The interface begins in English.
- Questions, solutions, marking-scheme content, and video explanations are authored in Sinhala.
- Questions and solutions use text with a safe Markdown/LaTeX-compatible math format.
- Raw arbitrary HTML is not trusted.
- Image and PDF ingestion are deferred.
- Every published question must have a solution and a valid marking scheme.
- A question may rely on a paper-level video if it has no question-specific video; the UI must state this clearly.
- A video source must contain a valid HTTPS URL from an allowed provider.

## 7. Publishing rules

A paper may be saved as a draft while incomplete. Before publication it must have:

- title and valid slug;
- level/session, Mathematics subject, exam year, paper number, and medium;
- at least one ordered question;
- a Sinhala solution for every question;
- a marking scheme for every question;
- mark values that satisfy the paper validation rules;
- at least one valid paper-level or question-level video source.

Draft and archived papers are never returned by public APIs.

## 8. Contact behavior

The public contact page provides:

- WhatsApp deep link;
- tap-to-call phone number;
- email link;
- YouTube, TikTok, and Facebook links;
- a website form stored in Supabase for admin review.

The form must have server-side validation, payload limits, rate limiting, a honeypot or equivalent spam control, and a documented retention policy. It may later send an email notification, but that is not required for the first database workflow.

## 9. Non-goals for MVP

- student accounts;
- student dashboards, bookmarks, or progress;
- quizzes, automated grading, or score calculators;
- payments, enrollment, or subscriptions;
- live classes, chat, or forums;
- native mobile apps;
- video hosting, uploads, or transcoding;
- general lesson authoring;
- image/PDF paper ingestion;
- offline-first synchronization;
- multiple subjects or grade levels in the first content release.

## 10. MVP acceptance journey

The release is accepted when an authorized admin can:

1. Sign in.
2. Create the latest O/L Mathematics paper.
3. Enter ordered questions, Sinhala solutions, and a full marking scheme.
4. Attach YouTube, TikTok, and/or Facebook links at paper or question level.
5. Preview and publish the paper.

A public visitor can then:

1. Find the paper using year, paper, medium, and Mathematics filters on a phone.
2. Read every question, solution, and marking-scheme step.
3. Watch an embedded video or open the original source.
4. Contact the tutor through an approved channel.

## 11. Operational details still to confirm

- exact first exam year and paper set;
- contact form fields and whether email notification is needed;
- one admin versus multiple admin roles;
- alternative marking-method behavior;
- brand name, domain, phone, email, and social URLs;
- analytics choice;
- contact/data retention policy.
