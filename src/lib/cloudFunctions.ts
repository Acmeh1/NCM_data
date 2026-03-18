import { supabase } from "@/integrations/supabase/client";

/**
 * Invoke an edge function on the local Supabase project (brbrlbhmwpekdipwfxci).
 */
export async function invokeCloudFunction<T = any>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: body ?? {},
    });

    if (error) {
      return { data: null, error };
    }
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: e };
  }
}
