import { NextResponse } from 'next/server'
import { createAuthenticatedRoute } from '@/lib/api-utils'

export const POST = createAuthenticatedRoute(async (_request, { user, serviceClient }) => {
  // 1. Check if user has a company
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single()

  if (profileError) {
    return NextResponse.json(
      { error: 'Profil konnte nicht geladen werden.' },
      { status: 500 }
    )
  }

  // 2. If no company: delete user's own projects (shifts cascade via FK ON DELETE CASCADE)
  if (!profile.company_id) {
    const { error: deleteProjectsError } = await serviceClient
      .from('projects')
      .delete()
      .eq('created_by', user.id)
      .is('company_id', null)

    if (deleteProjectsError) {
      return NextResponse.json(
        { error: 'Projekte konnten nicht gelöscht werden. Bitte versuche es erneut.' },
        { status: 500 }
      )
    }
  }

  // 3. Delete auth.users — cascades to profiles via FK ON DELETE CASCADE
  const { error: deleteUserError } = await serviceClient.auth.admin.deleteUser(user.id)

  if (deleteUserError) {
    return NextResponse.json(
      { error: 'Account konnte nicht gelöscht werden. Bitte versuche es erneut.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
})
