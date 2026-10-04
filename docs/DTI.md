# DTI project record — ISG Smart Library System

This document is editable. Replace bracketed prompts with actual observations, photographs of the prototype where permitted, and results from school testing.

## Problem Statement

Traditional school library workflows can involve manual searching, repetitive record keeping, difficulty tracking due dates, and limited personalization. [Add observations from the ISG library.]

## Empathy / Observation

[Record librarian and student interviews or observations. What takes time? Where do mistakes occur?]

## Define

How might a librarian identify a student and a specific physical book quickly, maintain reliable circulation records, and help students discover suitable books?

## Ideation

Ideas considered: student QR cards, separate QR labels for each book copy, ISBN metadata lookup, automatic due dates, email reminders, and explainable book suggestions. [Add alternatives and feedback.]

## Chosen Solution

A camera-assisted web application: scan student → scan copy → issue or return → update records → track deadlines → recommend a next book.

## System Design

Next.js handles the librarian interface and server endpoints. Supabase Auth identifies librarians, PostgreSQL stores records, row-level security limits access, and database functions complete circulation transactions. Open Library provides one-time metadata lookup. A deterministic content-based algorithm ranks recommendations. Mock or Brevo email sends notifications; a daily cron calls the reminder endpoint.

## Prototype

[Add screenshots of login, dashboard, card, label, circulation flow, reminder preview, and recommendations.]

## Hardware Used

Laptop or phone camera, internet connection, and printer for cards/labels. An optional future Quarky/eVive device could show green/red circulation feedback but is not part of the MVP.

## Software Used

Next.js, React, TypeScript, Supabase Auth/PostgreSQL, ZXing, Open Library, QRCode, optional Brevo, and Vercel Cron.

## Testing

Automated recommendation and reminder tests are included. Database integration tests can run on a disposable Supabase project. [Add actual device, browser, and librarian usability results.]

## Problems Encountered

[Record real problems, such as camera permission denial, poor barcode lighting, incomplete ISBN metadata, or email configuration issues.]

## Improvements Made

[Record changes made after testing, with before/after examples.]

## Future Improvements

Bulk CSV import, reading lists, recommendation feedback, optional hardware feedback, and optional cover recognition after the core workflow is stable.

## Final Outcome

[Summarize what worked in a live school demonstration, measured time savings if available, and remaining limitations.]
