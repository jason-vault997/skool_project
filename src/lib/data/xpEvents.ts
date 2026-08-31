import { supabase } from '../supabase/client';
import type { XpBreakdown } from '../supabase/types';

const EXECUTION_TYPES = ['lesson_completed', 'session_attended', 'daily_streak'];
const APPLICATION_TYPES = ['sales_call_logged', 'content_posted'];
const BUSINESS_TYPES = ['client_closed'];

interface XpRow {
  event_type: string;
  xp_amount: number;
}

export async function getXpBreakdown(userId: string): Promise<XpBreakdown> {
  const { data, error } = await supabase
    .from('xp_events')
    .select('event_type, xp_amount')
    .eq('user_id', userId);

  if (error) {
    console.error('[xpEvents] getXpBreakdown error:', error.message);
    return { execution: 0, application: 0, business: 0, total: 0 };
  }

  if (!data || data.length === 0) {
    return { execution: 0, application: 0, business: 0, total: 0 };
  }

  const rows = data as XpRow[];
  let execution = 0, application = 0, business = 0;

  for (const event of rows) {
    if (EXECUTION_TYPES.includes(event.event_type)) {
      execution += event.xp_amount;
    } else if (APPLICATION_TYPES.includes(event.event_type)) {
      application += event.xp_amount;
    } else if (BUSINESS_TYPES.includes(event.event_type)) {
      business += event.xp_amount;
    }
  }

  return { execution, application, business, total: execution + application + business };
}
