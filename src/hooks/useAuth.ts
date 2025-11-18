import { useState, useEffect } from 'react';
import { User as AuthUser } from '@supabase/supabase-js';
import { supabase, User } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkPasswordChangeRequired(session.user);
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkPasswordChangeRequired(session.user);
          fetchUserProfile(session.user.id);
        } else {
          setUserProfile(null);
          setRequiresPasswordChange(false);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkPasswordChangeRequired = (authUser: AuthUser) => {
    console.log('🔍 Checking password change requirement for user:', authUser.id);
    console.log('📋 User metadata:', authUser.user_metadata);
    console.log('🔍 App metadata:', authUser.app_metadata);
    console.log('🔍 Email confirmed:', authUser.email_confirmed_at);
    console.log('🔍 Created at:', authUser.created_at);
    const requiresChange = authUser.user_metadata?.requires_password_change === true;
    console.log('🔄 Password change required:', requiresChange);
    setRequiresPasswordChange(requiresChange);
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        setUserProfile(null);
      } else if (data) {
        setUserProfile(data);
      } else {
        console.warn(`No user profile found for user ID: ${userId}. User may need to be set up by an administrator.`);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Unexpected error fetching user profile:', error);
      setUserProfile(null);
    } finally {
      console.log('🏁 Final auth state - requiresPasswordChange:', requiresPasswordChange);
      console.log('👤 User profile loaded:', userProfile?.name || 'None');
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      
      if (error) {
        if (error.message === 'Invalid login credentials') {
          throw new Error('メールアドレスまたはパスワードが正しくありません。');
        } else if (error.message === 'Email not confirmed') {
          throw new Error('メールアドレスが確認されていません。');
        } else if (error.message === 'Too many requests') {
          throw new Error('ログイン試行回数が多すぎます。しばらく待ってから再試行してください。');
        } else {
          throw new Error(`ログインエラー: ${error.message}`);
        }
      }
      
      if (data.user?.user_metadata?.requires_password_change) {
        setRequiresPasswordChange(true);
      }
      
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const changePassword = async (newPassword: string) => {
    try {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (passwordError) throw passwordError;
      
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { requires_password_change: false }
      });
      
      if (metadataError) throw metadataError;
      
      setRequiresPasswordChange(false);
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  };

  const signOut = async () => {
    // First try to logout from Supabase
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error.message);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Then try to clear client-side session regardless of logout success/failure
    try {
      await supabase.auth.setSession({ access_token: '', refresh_token: '' });
    } catch (error) {
      console.error('Session clear error:', error);
    } finally {
      // Always reset all client-side state regardless of any errors
      setUser(null);
      setUserProfile(null);
      setLoading(false);
      setRequiresPasswordChange(false);
    }
  };

  return {
    user,
    userProfile,
    loading,
    requiresPasswordChange,
    signIn,
    signOut,
    changePassword,
  };
}