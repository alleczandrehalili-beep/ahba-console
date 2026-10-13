import { createHandler } from './handler.mjs';

// Supabase secrets remain solely in the Edge runtime. No dependency imports are required.
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error('Photo correction service configuration is incomplete');
const allowedOrigins = Deno.env.get('QA_PHOTO_ALLOWED_ORIGINS')?.split(',').map(origin => origin.trim()).filter(Boolean);
Deno.serve(createHandler({ supabaseUrl, anonKey, serviceRoleKey, allowedOrigins, maxFileSize: 10 * 1024 * 1024 }));
