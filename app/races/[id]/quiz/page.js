// © 2025 The Founded Project LLC — All rights reserved.
// app/races/[id]/quiz/page.js
//
// Deep link into the quiz for a specific race. The full flow (welcome →
// pre-question → quiz → results) lives on /align; this route hands the
// race id through so "Take quiz" buttons land directly on that race.

import { redirect } from 'next/navigation'

export default function RaceQuizPage({ params }) {
  redirect(`/align?race=${params.id}`)
}
