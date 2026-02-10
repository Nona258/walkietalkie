import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://blwojfybxsllgcwumiav.supabase.co";
const supabaseKey = "sb_publishable_GIQVmSJ0TmTNVrjk3ZHdIA_y4238CS6";
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
