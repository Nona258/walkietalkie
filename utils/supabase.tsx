import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://blwojfybxsllgcwumiav.supabase.co";
const supabaseKey = "sb_publishable_GIQVmSJ0TmTNVrjk3ZHdIA_y4238CS6";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsd29qZnlieHNsbGdjd3VtaWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NzU1NDYsImV4cCI6MjA4NjE1MTU0Nn0.G3WWzDN2sjh46qAVfPU_ME70w-gcREzMXpS1H0gY0mg"
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
