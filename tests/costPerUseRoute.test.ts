import { handleCostPerUse } from "../server/routes";
import * as supabaseModule from "../server/supabase";

// helper to build a fake supabase client with controlled responses
function makeFakeClient() {
  // build a chainable query object that mimics the supabase-js query builder
  // enough for our handler. We record the table and return the same chain for
  // select/eq/in/neq. The `then` method supports both callback-style usage and
  // promise-style awaiting.
  function defaultResult(table: string, query: Array<{op:string,args:any[]}> = []) {
    if (table === 'family_groups') {
      return { owner_id: 'owner123' };
    }
    if (table === 'family_group_settings') {
      return { show_family_data: true };
    }
    if (table === 'family_group_members') {
      return [{ user_id: 'member1' }, { user_id: 'member2' }];
    }
    if (table === 'subscriptions') {
      const all = [
        { id: 's1', user_id: 'owner123', amount: 10, frequency: 'monthly', status: 'active', usage_count: 2, currency: 'USD' },
        { id: 's2', user_id: 'member1', amount: 20, frequency: 'monthly', status: 'active', usage_count: 4, currency: 'USD' },
      ];
      // apply .in filter if present
      const inOp = query.find(q => q.op === 'in' && q.args[0] === 'user_id');
      if (inOp) {
        const allowed: string[] = inOp.args[1];
        return all.filter(r => allowed.includes(r.user_id));
      }
      return all;
    }
    return null;
  }

  return {
    from: (table: string) => {
      const chain: any = { _table: table, _query: [] };
      ['select', 'eq', 'in', 'neq'].forEach((op) => {
        chain[op] = (...args: any[]) => {
          chain._query.push({ op, args });
          return chain;
        };
      });
      chain.single = async () => {
        const data = defaultResult(table, chain._query);
        return { data, error: null };
      };
      chain.then = (arg1: any, arg2?: any) => {
        const rows = defaultResult(table, chain._query);
        const result = { data: rows, error: null };
        if (typeof arg1 === 'function') {
          // callback style
          return arg1(result);
        }
        // promise style: arg1 is resolve
        arg1(result);
      };
      return chain;
    },
  };
}

// simple token generator matching extractUserIdFromToken logic
function generateToken(userId: string) {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ sub: userId })).toString('base64');
  return `${header}.${payload}.signature`;
}

function makeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}

describe('handleCostPerUse route', () => {
  beforeEach(() => {
    // stub supabase client
    vi.spyOn(supabaseModule, 'getSupabaseClient').mockImplementation(() => makeFakeClient() as any);
  });

  it('returns aggregated subscriptions for owner when familyGroupId present', async () => {
    const req: any = { headers: { authorization: `Bearer ${generateToken('owner123')}` }, query: { familyGroupId: 'grp1' } };
    const res = makeRes();

    await handleCostPerUse(req, res);

    expect(res.json).toHaveBeenCalled();
    const result = res.json.mock.calls[0][0];
    // should include both owner and member subs
    expect(result.some((r: any) => r.subscriptionId === 's1')).toBeTruthy();
    expect(result.some((r: any) => r.subscriptionId === 's2')).toBeTruthy();
  });

  it('allows a regular member to see aggregated data as well', async () => {
    const req: any = { headers: { authorization: `Bearer ${generateToken('member1')}` }, query: { familyGroupId: 'grp1' } };
    const res = makeRes();

    await handleCostPerUse(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    const result = res.json.mock.calls[0][0];
    expect(result.length).toBe(2);
  });

  it('resets stale monthly usage to zero when computing cost per use', async () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const staleMonth = '2000-01';
    const fakeClient = {
      from: (table: string) => {
        const chain: any = { _table: table, _query: [] };
        ['select', 'eq', 'in', 'neq'].forEach((op) => {
          chain[op] = (...args: any[]) => {
            chain._query.push({ op, args });
            return chain;
          };
        });
        chain.single = async () => {
          if (table === 'subscriptions') {
            return {
              data: [
                {
                  id: 's3',
                  user_id: 'owner123',
                  amount: 20,
                  frequency: 'monthly',
                  status: 'active',
                  monthly_usage_count: 5,
                  usage_month: staleMonth,
                  currency: 'USD',
                },
              ],
              error: null,
            };
          }
          return { data: null, error: null };
        };
        chain.then = (arg1: any, arg2?: any) => {
          const rows = chain._table === 'subscriptions' ? [{
            id: 's3',
            user_id: 'owner123',
            amount: 20,
            frequency: 'monthly',
            status: 'active',
            monthly_usage_count: 5,
            usage_month: staleMonth,
            currency: 'USD',
          }] : null;
          const result = { data: rows, error: null };
          if (typeof arg1 === 'function') {
            return arg1(result);
          }
          arg1(result);
        };
        return chain;
      },
    };
    vi.spyOn(supabaseModule, 'getSupabaseClient').mockImplementation(() => fakeClient as any);

    const req: any = { headers: { authorization: `Bearer ${generateToken('owner123')}` }, query: {} };
    const res = makeRes();

    await handleCostPerUse(req, res);

    const result = res.json.mock.calls[0][0];
    expect(result.length).toBe(1);
    expect(result[0].usageCount).toBe(0);
    expect(result[0].costPerUse).toBe(20);
  });
});
