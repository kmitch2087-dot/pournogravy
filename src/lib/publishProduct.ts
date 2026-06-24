import { SupabaseClient } from '@supabase/supabase-js';

export async function setProductLive(
  supabase: SupabaseClient,
  productId: string,
  live: boolean
): Promise<{ error: Error | null }> {
  const { data: existing } = await supabase
    .from('products')
    .select('went_live_at')
    .eq('id', productId)
    .maybeSingle();

  const { error } = await supabase
    .from('products')
    .update({
      is_active: live,
      published: live,
      status: live ? 'published' : 'draft',
      publish_at: null,
      ...(live && !existing?.went_live_at ? { went_live_at: new Date().toISOString() } : {}),
    })
    .eq('id', productId);

  return { error: error ? new Error(error.message) : null };
}
