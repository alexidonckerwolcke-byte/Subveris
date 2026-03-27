import { createClient } from '@supabase/supabase-js';

/**
 * Check if a user has a specific notification preference enabled
 */
export async function checkNotificationPreference(
  userId: string,
  preferenceType: 'email' | 'push' | 'digest'
): Promise<boolean> {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('notification_preferences')
      .select(getPreferenceColumn(preferenceType))
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // Default to true if preferences not found (new user)
      return true;
    }

    const column = getPreferenceColumn(preferenceType);
    return data[column] === true;
  } catch (error) {
    console.error('[NotificationPreference] Error checking preference:', error);
    // Default to true on error to ensure notifications are sent
    return true;
  }
}

/**
 * Map preference type to database column name
 */
function getPreferenceColumn(preferenceType: 'email' | 'push' | 'digest'): string {
  switch (preferenceType) {
    case 'email':
      return 'email_notifications';
    case 'push':
      return 'push_notifications';
    case 'digest':
      return 'weekly_digest';
    default:
      return 'email_notifications';
  }
}
