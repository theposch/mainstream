/**
 * User Integrations API Route
 * 
 * Manages external service integrations (Figma, etc.) for the current user.
 * 
 * GET  /api/users/me/integrations - Get integration status (not the actual tokens)
 * POST /api/users/me/integrations - Update integration tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET - Retrieve current user's integration status
 * Returns which integrations are connected (not the tokens themselves)
 */
export async function GET() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Fetch user's integration status (not the actual tokens)
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('figma_access_token, figma_token_updated_at')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('[GET /api/users/me/integrations] Error fetching user:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch integrations' },
        { status: 500 }
      );
    }

    // Return connection status, not the actual tokens
    return NextResponse.json({
      integrations: {
        figma: {
          connected: !!userData?.figma_access_token,
          connectedAt: userData?.figma_token_updated_at || null,
          // Mask the token for display (show last 4 chars)
          tokenPreview: userData?.figma_access_token 
            ? `•••${userData.figma_access_token.slice(-4)}`
            : null,
        },
      },
    });
  } catch (error) {
    console.error('[GET /api/users/me/integrations] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Update user's integration tokens
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { provider, token } = body;

    if (!provider || typeof provider !== 'string') {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      );
    }

    // Currently only support Figma
    if (provider !== 'figma') {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}` },
        { status: 400 }
      );
    }

    // Validate Figma token format (if provided)
    if (token && typeof token === 'string') {
      // Figma tokens start with 'figd_' for personal access tokens
      if (!token.startsWith('figd_')) {
        return NextResponse.json(
          { error: 'Invalid Figma token format. Personal Access Tokens start with "figd_"' },
          { status: 400 }
        );
      }

      // Test the token by making a simple API call
      const testResponse = await fetch('https://api.figma.com/v1/me', {
        headers: {
          'X-Figma-Token': token,
        },
      });

      if (!testResponse.ok) {
        return NextResponse.json(
          { error: 'Invalid Figma token. Please check your Personal Access Token.' },
          { status: 400 }
        );
      }
    }

    // Update the token
    const updateData: Record<string, unknown> = {
      figma_access_token: token || null, // null to disconnect
      figma_token_updated_at: token ? new Date().toISOString() : null,
    };

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('[POST /api/users/me/integrations] Error updating:', updateError);
      return NextResponse.json(
        { error: 'Failed to update integration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: token ? 'Figma connected successfully' : 'Figma disconnected',
      integration: {
        connected: !!token,
        connectedAt: token ? new Date().toISOString() : null,
        tokenPreview: token ? `•••${token.slice(-4)}` : null,
      },
    });
  } catch (error) {
    console.error('[POST /api/users/me/integrations] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

