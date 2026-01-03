
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a mock supabase client for demo mode when env vars are missing
const createMockClient = (): SupabaseClient => {
    console.warn("⚠️ Running in DEMO MODE - Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local");

    const mockAuth = {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        signInWithOAuth: () => Promise.resolve({ data: null, error: { message: 'Demo mode - auth disabled' } }),
        signOut: () => Promise.resolve({ error: null }),
    };

    const mockStorage = {
        from: () => ({
            upload: () => Promise.resolve({ error: { message: 'Demo mode' } }),
            getPublicUrl: () => ({ data: { publicUrl: '' } }),
        }),
    };

    const mockFrom = () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: { message: 'Demo mode' } }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
    });

    return {
        auth: mockAuth,
        storage: mockStorage,
        from: mockFrom,
    } as unknown as SupabaseClient;
};

export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createMockClient();

export const isDemoMode = !supabaseUrl || !supabaseAnonKey;

export type Profile = {
    id: string;
    email: string;
    full_name?: string;
    stripe_customer_id?: string;
    subscription_tier?: 'free' | 'pro';
    avatar_url?: string;
    updated_at?: string;
};

export type Project = {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at?: string;
};

export type Artifact = {
    id: string;
    project_id: string;
    type: 'visualizer' | 'pattern' | 'cutting' | 'costing' | 'social';
    title: string;
    data: any;
    image_url?: string;
    created_at: string;
};
