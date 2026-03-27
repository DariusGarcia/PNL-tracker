# PNL Tracker

A Next.js + Tailwind app for tracking daily stock profit and loss with Google sign-in through Firebase.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Create a Firebase project.
3. Enable `Authentication > Sign-in method > Google`.
4. Create a Firestore database.
5. Paste your Firebase web app keys into `.env.local`.
6. Run `npm install`.
7. Run `npm run dev`.

## Firestore suggestion

Use a collection structure like:

- `users/{uid}/pnlEntries/{YYYY-MM-DD}`

Each document stores:

- `amount`
- `date`
- `note`
- `updatedAt`

## Suggested Firestore rules

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/pnlEntries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
