import supabase from './supabase';

/**
 * Check if a user has accepted the EULA
 * @param userId - The user's ID
 * @returns true if user has accepted EULA, false otherwise
 */
export const hasAcceptedEula = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('eula_acceptance')
      .select('id')
      .eq('user_id', userId);

    if (error) {
      // Table might not exist yet, or no record found - user hasn't accepted
      console.log('EULA check error (expected if first time):', error.message);
      return false;
    }

    return !!data && data.length > 0;
  } catch (error) {
    console.error('Error checking EULA acceptance:', error);
    return false;
  }
};

/**
 * Record EULA acceptance for a user
 * @param userId - The user's ID
 * @returns true if successful, false otherwise
 */
export const acceptEula = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('eula_acceptance')
      .insert([
        {
          user_id: userId,
          accepted_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error('Error accepting EULA:', error);
      return false;
    }

    console.log('EULA accepted successfully');
    return true;
  } catch (error) {
    console.error('Error in acceptEula:', error);
    return false;
  }
};

/**
 * Sign out the current user
 */
export const signOutUser = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error signing out:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in signOutUser:', error);
    return false;
  }
};
