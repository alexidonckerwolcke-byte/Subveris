import { supabase } from './supabase';

// Handle all API endpoints by mapping them to Supabase operations
export async function handleApiRequest(method: string, url: string, data?: unknown): Promise<Response> {
  console.log('[handleApiRequest] Processing', method, url);
  
  // Remove leading/trailing slashes and parse the path
  let path = url.startsWith('/') ? url.slice(1) : url;
  path = path.endsWith('/') ? path.slice(0, -1) : path;
  
  const [endpoint, queryString] = path.split('?');
  
  // Parse query parameters
  const params = new URLSearchParams(queryString || '');
  
  console.log('[handleApiRequest] Endpoint:', endpoint, 'Params:', Object.fromEntries(params));
  
  // Route to appropriate handler
  if (endpoint.includes('api/subscriptions')) {
    return handleSubscriptions(method, params);
  } else if (endpoint.includes('api/metrics')) {
    return handleMetrics(method, params);
  } else if (endpoint.includes('api/spending/monthly')) {
    return handleMonthlySpending(method, params);
  } else if (endpoint.includes('api/spending/category')) {
    return handleCategorySpending(method, params);
  } else if (endpoint.includes('api/family-groups/me/membership')) {
    return handleFamilyMembership(method, params);
  } else if (endpoint.includes('api/family-groups')) {
    return handleFamilyGroups(method, params);
  } else if (endpoint.includes('api/recommendations')) {
    return handleRecommendations(method, params);
  } else if (endpoint.includes('api/insights/behavioral')) {
    return handleBehavioralInsights(method, params);
  } else if (endpoint.includes('api/analysis/cost-per-use')) {
    return handleCostPerUse(method, params);
  } else if (endpoint.includes('api/user/premium-status')) {
    return handlePremiumStatus(method, params);
  } else if (endpoint.includes('api/analytics/monthly-savings')) {
    return handleMonthlySavings(method, params);
  } else if (endpoint.includes('api/insights')) {
    return handleInsights(method, params);
  }
  
  console.warn('[handleApiRequest] Endpoint not found:', endpoint);
  return new Response(JSON.stringify({ error: 'Endpoint not found' }), { status: 404 });
}

async function handleSubscriptions(method: string, params: URLSearchParams) {
  try {
    if (!supabase) {
      console.error('[handleSubscriptions] Supabase not initialized');
      return new Response(JSON.stringify({ error: 'Supabase not initialized' }), { status: 500 });
    }

    console.log('[handleSubscriptions] Getting authenticated user...');
    console.log('[handleSubscriptions] supabase.auth:', typeof supabase.auth);
    
    const authUser = await supabase.auth.getUser();
    console.log('[handleSubscriptions] Auth result:', authUser);
    
    const { data: { user }, error: authError } = authUser;
    
    if (authError) {
      console.error('[handleSubscriptions] Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Authentication error: ' + authError.message }), { status: 401 });
    }
    
    if (!user) {
      console.warn('[handleSubscriptions] User not authenticated (null)');
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }
    
    console.log('[handleSubscriptions] Authenticated as:', user.id, user.email);

    const page = parseInt(params.get('page') || '1');
    const perPage = parseInt(params.get('perPage') || '50');
    const offset = (page - 1) * perPage;

    console.log('[handleSubscriptions] Fetching for user:', user.id, 'page:', page, 'perPage:', perPage);

    // Fetch subscriptions - removed is_detected filter for now to debug
    const { data: subscriptions, count, error } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (error) {
      console.error('[handleSubscriptions] Database error:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const response = new Response(JSON.stringify(subscriptions || []), {
      status: 200,
      headers: new Headers({
        'x-total-count': String(count || 0),
        'content-type': 'application/json',
      }),
    });

    console.log('[handleSubscriptions] Returning', (subscriptions || []).length, 'subscriptions, total:', count);
    return response;
  } catch (error) {
    console.error('[handleSubscriptions] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(error) }), { status: 500 });
  }
}

async function handleMetrics(method: string, params: URLSearchParams) {
  try {
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Supabase not initialized' }), { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    // Fetch active subscriptions
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_detected', true);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    // Calculate metrics
    let totalMonthlySpend = 0;
    let activeSubscriptions = 0;
    let unusedSubscriptions = 0;
    let toCancelSubscriptions = 0;

    (subscriptions || []).forEach(sub => {
      if (sub.status !== 'cancelled') {
        activeSubscriptions++;
        totalMonthlySpend += sub.price || 0;
        if (sub.marked_to_cancel) {
          toCancelSubscriptions++;
        }
        if (sub.usage_frequency === 'never') {
          unusedSubscriptions++;
        }
      }
    });

    const metrics = {
      total_subscriptions: subscriptions?.length || 0,
      active_subscriptions: activeSubscriptions,
      monthly_spend: totalMonthlySpend,
      unused_subscriptions: unusedSubscriptions,
      to_cancel_subscriptions: toCancelSubscriptions,
    };

    return new Response(JSON.stringify(metrics), { status: 200 });
  } catch (error) {
    console.error('Error calculating metrics:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

async function handleMonthlySpending(method: string, params: URLSearchParams) {
  try {
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Supabase not initialized' }), { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    // Call Supabase Edge Function with timezone offset
    const offsetMinutes = new Date().getTimezoneOffset();
    // Build a local YYYY-MM-DD date string (local timezone)
    const now = new Date();
    const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const apiUrl = `${supabaseUrl}/functions/v1/api/spending/monthly?offsetMinutes=${offsetMinutes}&localDate=${localDateStr}`;
    
    const accessToken = (await supabase.auth.getSession())?.data?.session?.access_token;
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken || ''}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Supabase function error:', response.status, await response.text());
      return new Response(JSON.stringify({ error: 'Spending data unavailable' }), { status: response.status });
    }

    const monthlySpending = await response.json();
    return new Response(JSON.stringify(monthlySpending), { status: 200 });
  } catch (error) {
    console.error('Error fetching monthly spending:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

async function handleCategorySpending(method: string, params: URLSearchParams) {
  try {
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Supabase not initialized' }), { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    // Call Supabase Edge Function with timezone offset
    const offsetMinutes = new Date().getTimezoneOffset();
    // Build a local YYYY-MM-DD date string (local timezone)
    const now = new Date();
    const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const apiUrl = `${supabaseUrl}/functions/v1/api/spending/category?offsetMinutes=${offsetMinutes}&localDate=${localDateStr}`;
    
    const accessToken = (await supabase.auth.getSession())?.data?.session?.access_token;
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken || ''}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Supabase function error:', response.status, await response.text());
      return new Response(JSON.stringify({ error: 'Spending data unavailable' }), { status: response.status });
    }

    const categorySpending = await response.json();
    return new Response(JSON.stringify(categorySpending), { status: 200 });
  } catch (error) {
    console.error('Error fetching category spending:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
    const totalAmount = Object.values(categoryObj).reduce((sum, cat) => sum + cat.amount, 0);

    // Convert to array format with percentages
    const categorySpending = Object.entries(categoryObj).map(([category, data]) => ({
      category: category as any,
      amount: Math.round(data.amount * 100) / 100,
      percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0,
      count: data.count,
    })).sort((a, b) => b.amount - a.amount);

    return new Response(JSON.stringify(categorySpending), { status: 200 });
  } catch (error) {
    console.error('Error calculating category spending:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

async function handleFamilyGroups(method: string, params: URLSearchParams) {
  try {
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Supabase not initialized' }), { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    // Fetch groups owned by user
    const { data: ownerGroups, error: ownerError } = await supabase
      .from('family_groups')
      .select('id,name,created_at,owner_id')
      .eq('owner_id', user.id);

    if (ownerError) {
      throw ownerError;
    }

    // Fetch groups where user is a member
    const { data: memberRows, error: memberError } = await supabase
      .from('family_group_members')
      .select('family_group_id')
      .eq('user_id', user.id);

    if (memberError) {
      throw memberError;
    }

    // Collect all group IDs (owned + member)
    const groupIds = Array.from(
      new Set([
        ...(ownerGroups || []).map((group: any) => group.id),
        ...(memberRows || []).map((member: any) => member.family_group_id),
      ])
    ).filter(Boolean);

    // Fetch all groups where user is involved
    let allGroups = ownerGroups || [];
    if (groupIds.length > 0) {
      const { data: groupRows, error: groupRowsError } = await supabase
        .from('family_groups')
        .select('id,name,created_at,owner_id')
        .in('id', groupIds);

      if (groupRowsError) {
        throw groupRowsError;
      }

      allGroups = groupRows || [];
    }

    const response = (allGroups || []).map((group: any) => ({
      id: group.id,
      name: group.name,
      createdAt: group.created_at,
      ownerId: group.owner_id,
    }));

    return new Response(JSON.stringify(response), { status: 200 });
  } catch (error) {
    console.error('Error fetching family groups:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

async function handleFamilyMembership(method: string, params: URLSearchParams) {
  try {
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Supabase not initialized' }), { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    // Fetch family group membership for user
    const { data: groups, error } = await supabase
      .from('family_groups')
      .select('*')
      .contains('members', JSON.stringify([{ user_id: user.id }]))
      .single();

    if (error && error.code !== 'PGRST116') {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ membership: groups || null }), { status: 200 });
  } catch (error) {
    console.error('Error fetching family membership:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

async function handleRecommendations(method: string, params: URLSearchParams) {
  try {
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Supabase not initialized' }), { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    // Fetch recommendations for user
    const { data: recommendations, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ recommendations: recommendations || [] }), { status: 200 });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

async function handleBehavioralInsights(method: string, params: URLSearchParams) {
  try {
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Supabase not initialized' }), { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    // Fetch subscriptions for behavioral analysis
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_detected', true);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    // Generate behavioral insights
    const insights = {
      frequent_cancellations: (subscriptions || []).filter(s => s.marked_to_cancel).length > 3,
      unused_services: (subscriptions || []).filter(s => s.usage_frequency === 'never').length,
      peak_spending_month: 'N/A',
      subscription_growth: (subscriptions || []).length,
    };

    return new Response(JSON.stringify({ behavioral_insights: insights }), { status: 200 });
  } catch (error) {
    console.error('Error generating behavioral insights:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

async function handleCostPerUse(method: string, params: URLSearchParams) {
  try {
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Supabase not initialized' }), { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    // Fetch subscriptions with usage data
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_detected', true);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    // Calculate opportunity costs - subscriptions with low usage frequency
    const opportunityCosts = (subscriptions || [])
      .filter(sub => {
        // Only show subscriptions that are potentially under-utilized
        const usageCount = sub.usage_count || 0;
        return usageCount < 5; // Less than 5 uses
      })
      .map(sub => ({
        subscriptionId: sub.id,
        subscriptionName: sub.name,
        monthlyAmount: sub.amount || 0,
        currency: sub.currency || 'USD',
        equivalents: [
          { item: 'Coffee', count: Math.floor((sub.amount || 0) / 5), icon: '☕' },
          { item: 'Movie tickets', count: Math.floor((sub.amount || 0) / 15), icon: '🎬' },
        ],
        status: sub.status,
        subStatus: sub.status,
      }))
      .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

    return new Response(JSON.stringify(opportunityCosts), { status: 200 });
  } catch (error) {
    console.error('Error calculating cost per use:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

async function handlePremiumStatus(method: string, params: URLSearchParams) {
  try {
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Supabase not initialized' }), { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    // Fetch user plan info
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('plan_type')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const isPremium = profile?.plan_type === 'premium' || profile?.plan_type === 'family';

    return new Response(JSON.stringify({ is_premium: isPremium }), { status: 200 });
  } catch (error) {
    console.error('Error fetching premium status:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

async function handleMonthlySavings(method: string, params: URLSearchParams) {
  try {
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Supabase not initialized' }), { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    // Fetch subscriptions marked to cancel
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('marked_to_cancel', true)
      .eq('is_detected', true);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const monthlySavings = (subscriptions || []).reduce((sum, sub) => sum + (sub.price || 0), 0);

    return new Response(JSON.stringify({ monthly_savings: monthlySavings }), { status: 200 });
  } catch (error) {
    console.error('Error calculating monthly savings:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

async function handleInsights(method: string, params: URLSearchParams) {
  try {
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Supabase not initialized' }), { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    // Fetch insights for user
    const { data: insights, error } = await supabase
      .from('insights')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify(insights || []), { status: 200 });
  } catch (error) {
    console.error('Error fetching insights:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
