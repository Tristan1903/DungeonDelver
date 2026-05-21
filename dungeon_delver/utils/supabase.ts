import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://bamnuptwyoamohbleluh.supabase.co";
const supabaseAnonKey = "sb_publishable_cCBSHUMVM4o65spJb-nPRA_I1t8kiuy";


const supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);

export const supabase = supabaseInstance;