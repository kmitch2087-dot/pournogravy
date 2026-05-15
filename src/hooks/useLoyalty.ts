import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface LoyaltyAccount {
  points_balance: number;
  lifetime_points: number;
}

interface LoyaltyTransaction {
  id: string;
  points: number;
  type: string;
  description: string | null;
  created_at: string;
}

export const useLoyalty = () => {
  const { user } = useAuth();
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const [{ data: acct }, { data: tx }] = await Promise.all([
      supabase.from("loyalty_accounts").select("points_balance, lifetime_points").eq("user_id", user.id).maybeSingle(),
      supabase.from("loyalty_transactions").select("id, points, type, description, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);
    setAccount(acct ?? null);
    setTransactions(tx ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const redeem = useCallback(async (): Promise<{ code: string; discount_cents: number } | { error: string }> => {
    const { data, error } = await supabase.functions.invoke("redeem-points", { body: {} });
    if (error) return { error: error.message };
    await refresh();
    return data;
  }, [refresh]);

  // Points to next reward (every 100 points = $5)
  const pointsToNextReward = account ? 100 - (account.points_balance % 100) : 100;
  const rewardsAvailable = account ? Math.floor(account.points_balance / 100) : 0;

  return { account, transactions, loading, redeem, refresh, pointsToNextReward, rewardsAvailable };
};
