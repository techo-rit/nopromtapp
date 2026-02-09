import { createAdminClient, getUserFromRequest } from '../lib/auth.js';

export async function userSubscriptionHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ success: false, error: authResult.error });
    }
    const user = authResult.user;

    const userId = user.id;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, credits, created_at')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(10);

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
  } catch (error) {
    console.error('Get subscription error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch subscription status' });
  }
}
