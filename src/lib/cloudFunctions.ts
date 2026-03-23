import { supabase } from "@/integrations/supabase/client";

/**
 * Invoke an edge function on the local Supabase project (brbrlbhmwpekdipwfxci).
 */
export async function invokeCloudFunction<T = any>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const anonKey = (supabase as any).supabaseKey;
    const headers: Record<string, string> = {
      apikey: anonKey,
      Authorization: `Bearer ${session?.access_token ?? anonKey}`,
    };

    console.log(`Invoking function: ${functionName}`);

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: body ?? {},
      headers,
    });

    if (error) {
      console.error(`Error invoking edge function ${functionName}:`, error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (e: any) {
    console.error(`Exception invoking edge function ${functionName}:`, e);
    return { data: null, error: e };
  }
}
