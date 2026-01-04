/**
 * API: Get User Subscription Status
 * GET /api/user-subscription
 * 
 * Returns the current user's subscription and credits info.
 * SECURITY: Now requires authentication - user can only access their own data.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get environment variables
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'Database not configured' 
      });
    }

    // SECURITY: Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized - missing auth token' 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');

    // Verify the JWT and get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized - invalid session' 
      });
    }

    // SECURITY: User can only access their own data
    const userId = user.id;

    // Get user profile with credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, credits, created_at')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Get recent subscriptions (last 10)
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate total credits purchased
    const totalCreditsPurchased = (subscriptions || []).reduce(
      (sum, sub) => sum + (sub.credits_purchased || 0),
      0
    );

    return res.status(200).json({
      success: true,
      profile: {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        credits: profile.credits || 0,
        createdAt: profile.created_at,
      },
      subscriptions: subscriptions || [],
      stats: {
        totalCreditsPurchased,
        totalPayments: (subscriptions || []).length,
      },
    });

  } catch (error: any) {
    console.error('Get subscription error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch subscription status' 
    });
  }
}
