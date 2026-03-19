import { useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface TokenBalance {
  mint: string;
  decimals: number;
  amount: string;
  uiAmountString: string | null;
}

export interface AddressBalances {
  sol: number;
  tokens: TokenBalance[];
}

export const getWalletBalances = async (
  address: string,
  options?: RequestInit
): Promise<AddressBalances> => {
  return customFetch<AddressBalances>(`/api/wallet/${encodeURIComponent(address)}/balances`, {
    ...options,
    method: "GET",
  });
};

export const getWalletBalancesQueryKey = (address: string) =>
  ["/api/wallet", address, "balances"] as const;

export function useGetWalletBalances(
  address: string,
  options?: {
    query?: { enabled?: boolean };
  }
) {
  return useQuery({
    queryKey: getWalletBalancesQueryKey(address),
    queryFn: () => getWalletBalances(address),
    enabled: options?.query?.enabled ?? !!address,
  });
}
