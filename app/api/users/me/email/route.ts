/**
 * Email Change API Route
 * 
 * Handles updating the user's email address
 * 
 * POST /api/users/me/email - Request email change
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/users/me/email
 * 
 * Request email change - sends confirmation to new email
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email is same as current
    if (email === authUser.email) {
      return NextResponse.json(
        { error: 'New email must be different from current email' },
        { status: 400 }
      );
    }

    // Update email via Supabase Auth
    // This sends a confirmation email to the new address
    const { error: updateError } = await supabase.auth.updateUser({
      email: email,
    });

    if (updateError) {
      console.error('[POST /api/users/me/email] Update error:', updateError);
      
      if (updateError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'This email is already in use' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: updateError.message || 'Failed to update email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent. Please check your new email inbox to confirm the change.',
    });
  } catch (error) {
    console.error('[POST /api/users/me/email] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

