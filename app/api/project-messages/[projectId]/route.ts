import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/app/lib/supabase';
import { verifyPortalToken } from '@/app/lib/portal-token';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const token = request.nextUrl.searchParams.get('token');

  let authorized = false;

  if (token && verifyPortalToken(projectId, token)) {
    authorized = true;
  } else {
    const session = await auth();
    if (session?.user?.id) {
      // Allow if the user is the provider who owns the project
      const { data: asProvider } = await supabase
        .from('coredon_projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', session.user.id)
        .single();

      if (asProvider) {
        authorized = true;
      } else if (session.user.email) {
        // Allow if the logged-in user is the client on this project
        const { data: asClient } = await supabase
          .from('coredon_projects')
          .select('id')
          .eq('id', projectId)
          .eq('email', session.user.email)
          .single();
        authorized = !!asClient;
      }
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('coredon_project_messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}
