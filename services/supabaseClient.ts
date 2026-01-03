
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables. Please check your .env file.");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

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
