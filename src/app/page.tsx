import { redirect } from 'next/navigation'

// Root page redirects via middleware.
// This server component acts as a fallback.
export default function RootPage() {
  redirect('/login')
}
