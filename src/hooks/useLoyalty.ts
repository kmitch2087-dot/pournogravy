import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

interface LoyaltyRules {
  redemption_threshold: number;
  redemption_value_cents: number;
  points_per_dollar: number;
  pour_points_enabled: boolean;
}

export const useLoyalty = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: rules = null } = useQuery<LoyaltyRules | null>({
    queryKey: ["loyalty-rules"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("loyalty_rules")
        .select("redemption_threshold, redemption_value_cents, points_per_dollar, pour_points_enabled")
        .eq("id", 1)
        .maybeSingle();
      return data ?? null;
    },
  });

  const { data: account = null, isLoading: acctLoading } = useQuery<LoyaltyAccount | null>({
    queryKey: ["loyalty-account", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("loyalty_accounts")
        .select("points_balance, lifetime_points")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data ?? null;
    },
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery<LoyaltyTransaction[]>({
    queryKey: ["loyalty-transactions", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("loyalty_transactions")
        .select("id, points, type, description, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["loyalty-account", user?.id] });
    qc.invalidateQueries({ queryKey: ["loyalty-transactions", user?.id] });
  }, [qc, user?.id]);

  const redeem = useCallback(async (): Promise<{ code: string; discount_cents: number } | { error: string }> => {
    const { data, error } = await supabase.functions.invoke("redeem-points", { body: {} });
    if (error) return { error: error.message };
    refresh();
    return data;
  }, [refresh]);

  const threshold = rules?.redemption_threshold ?? 100;
  const loading = acctLoading || txLoading;
  const pointsToNextReward = account ? threshold - (account.points_balance % threshold) : threshold;
  const rewardsAvailable = account ? Math.floor(account.points_balance / threshold) : 0;

  const programEnabled = rules?.pour_points_enabled ?? true;

  return { account, transactions, loading, rules, redeem, refresh, pointsToNextReward, rewardsAvailable, programEnabled };
};
