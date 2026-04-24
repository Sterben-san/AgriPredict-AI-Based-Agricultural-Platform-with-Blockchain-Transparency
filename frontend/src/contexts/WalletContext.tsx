import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { getUserRole, loginUser } from "@/services/api";

type Role = "farmer" | "buyer" | "logistics";

// Mock Conversion Rate for Demo
export const ETH_TO_INR_RATE = 291553.48;

interface WalletContextType {
  walletAddress: string | null;
  userRole: Role | null;
  isNewUser: boolean;
  balance: string; // Store as string (ETH) to avoid float precision issues for display
  setUserRole: (role: Role) => void;
  setIsNewUser: (isNew: boolean) => void;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshBalance: () => Promise<void>;
  deductBalance: (amount: number) => void;
  isConnecting: boolean;
  showAccountSelector: boolean;
  setShowAccountSelector: (show: boolean) => void;
  openAccountSelector: () => void;
  hardhatAccounts: { address: string; label: string; role: Role }[];
  handleAccountSelect: (address: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [balance, setBalance] = useState<string>("0.00");
  const [isNewUser, setIsNewUser] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  // Hardhat Accounts (Mock)
  const [hardhatAccounts, setHardhatAccounts] = useState<
    { address: string; label: string; role: Role }[]
  >([]);

  useEffect(() => {
    // Restore wallet from localStorage (wrapped for sandbox safety)
    let savedWallet: string | null = null;
    let savedRole: string | null = null;
    try {
      savedWallet = localStorage.getItem("global_wallet_address");
      savedRole = localStorage.getItem("global_user_role");
    } catch (e) {
      console.warn("localStorage not available");
    }

    if (savedWallet) {
      setWalletAddress(savedWallet);
      if (savedRole) {
        setUserRole(savedRole as Role);
      } else {
        // Validation check if role is missing but wallet exists
        checkUserRole(savedWallet);
      }
      // Fetch balance for restored wallet
      fetchBalance(savedWallet);
    }

    // Fetch Hardhat accounts dynamically
    fetchHardhatAccounts();

    // Listen for chain/account changes
    if (typeof window.ethereum !== "undefined") {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          handleAccountSelect(accounts[0]);
        } else {
          disconnectWallet();
        }
      });
    }

    // Poll for balance updates every 15 seconds
    const intervalId = setInterval(() => {
      if (walletAddress) {
        fetchBalance(walletAddress);
      }
    }, 15000);

    return () => {
      clearInterval(intervalId);
      if (typeof window.ethereum !== "undefined") {
        window.ethereum.removeAllListeners("accountsChanged");
      }
    };
  }, [walletAddress]);

  const fetchBalance = async (address: string) => {
    try {
      if (typeof window.ethereum !== "undefined") {
        const balanceHex = await window.ethereum.request({
          method: "eth_getBalance",
          params: [address, "latest"],
        });
        const balanceWei = BigInt(balanceHex);
        const balanceEth = Number(balanceWei) / 1e18;
        setBalance(balanceEth.toFixed(4));
      } else {
        // Fallback to local JSON-RPC
        const response = await fetch(import.meta.env.VITE_BLOCKCHAIN_URL || "http://localhost:8545", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getBalance",
            params: [address, "latest"],
            id: 1,
          }),
        });
        const data = await response.json();
        if (data.result) {
          const balanceWei = BigInt(data.result);
          const balanceEth = Number(balanceWei) / 1e18;
          setBalance(balanceEth.toFixed(4));
        }
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    }
  };

  const fetchHardhatAccounts = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_BLOCKCHAIN_URL || "http://localhost:8545", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_accounts",
          params: [],
          id: 1,
        }),
      });

      const data = await response.json();
      if (data.result && Array.isArray(data.result)) {
        const accounts = data.result.slice(0, 3);
        const mappedAccounts = [
          {
            address: accounts[0],
            label: "Account #0 (Farmer)",
            role: "farmer" as Role,
          },
          {
            address: accounts[1],
            label: "Account #1 (Buyer)",
            role: "buyer" as Role,
          },
          {
            address: accounts[2],
            label: "Account #2 (Logistics)",
            role: "logistics" as Role,
          },
        ].filter((acc) => acc.address); // Ensure we have addresses

        setHardhatAccounts(mappedAccounts);
      }
    } catch (error) {
      console.warn(
        "Could not fetch local Hardhat accounts. Is the node running?",
        error,
      );
      // Fallback to hardcoded if fetch fails (e.g. node not running or different port)
      setHardhatAccounts([
        {
          address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          label: "Account #0 (Farmer)",
          role: "farmer" as Role,
        },
        {
          address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          label: "Account #1 (Buyer)",
          role: "buyer" as Role,
        },
        {
          address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          label: "Account #2 (Logistics)",
          role: "logistics" as Role,
        },
      ]);
    }
  };

  const checkUserRole = async (address: string) => {
    try {
      // First check database
      const data = await getUserRole(address);
      if (data && data.role) {
        setUserRole(data.role as Role);
        localStorage.setItem("global_user_role", data.role);
        setIsNewUser(false);
        return;
      }

      // If not in database, wait for hardhat accounts to be populated
      // Try fetching hardhat accounts if not already populated
      let accounts = hardhatAccounts;
      if (accounts.length === 0) {
        // Fetch accounts synchronously
        try {
          const response = await fetch(import.meta.env.VITE_BLOCKCHAIN_URL || "http://localhost:8545", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_accounts",
              params: [],
              id: 1,
            }),
          });
          const result = await response.json();
          if (result.result && Array.isArray(result.result)) {
            const fetchedAccounts = result.result.slice(0, 3);
            accounts = [
              {
                address: fetchedAccounts[0],
                label: "Account #0 (Farmer)",
                role: "farmer" as Role,
              },
              {
                address: fetchedAccounts[1],
                label: "Account #1 (Buyer)",
                role: "buyer" as Role,
              },
              {
                address: fetchedAccounts[2],
                label: "Account #2 (Logistics)",
                role: "logistics" as Role,
              },
            ].filter((acc) => acc.address);
          }
        } catch (err) {
          // Fallback to hardcoded accounts
          accounts = [
            {
              address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
              label: "Account #0 (Farmer)",
              role: "farmer" as Role,
            },
            {
              address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
              label: "Account #1 (Buyer)",
              role: "buyer" as Role,
            },
            {
              address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
              label: "Account #2 (Logistics)",
              role: "logistics" as Role,
            },
          ];
        }
      }

      // Check if it matches a hardhat account
      const mockAccount = accounts.find(
        (acc) => acc.address.toLowerCase() === address.toLowerCase(),
      );

      if (mockAccount) {
        // Auto-register the user in the database with the correct role
        try {
          await loginUser({
            wallet_address: address,
            role: mockAccount.role,
          });
        } catch (err) {
          console.warn("Failed to auto-register user:", err);
        }

        setUserRole(mockAccount.role);
        localStorage.setItem("global_user_role", mockAccount.role);
        setIsNewUser(false);
      } else {
        // Truly new user
        setUserRole(null);
        setIsNewUser(true);
      }
    } catch (error) {
      console.error("Failed to check user role:", error);
      // On error, set as new user
      setUserRole(null);
      setIsNewUser(true);
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    // User requested to default to the mock/role selector
    setTimeout(() => {
      setShowAccountSelector(true);
      setIsConnecting(false);
    }, 500);
  };

  const handleAccountSelect = async (address: string) => {
    setWalletAddress(address);
    localStorage.setItem("global_wallet_address", address);
    setShowAccountSelector(false);
    toast.success(`Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);

    await fetchBalance(address);
    await checkUserRole(address);
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setUserRole(null);
    setBalance("0.00");
    setIsNewUser(false);
    localStorage.removeItem("global_wallet_address");
    localStorage.removeItem("global_user_role");
    toast.info("Wallet disconnected");
  };

  const refreshBalance = async () => {
    if (walletAddress) {
      await fetchBalance(walletAddress);
    }
  };

  const deductBalance = (amount: number) => {
    setBalance((prev) => {
      const current = parseFloat(prev);
      const newBalance = Math.max(0, current - amount);
      return newBalance.toFixed(4);
    });
  };

  const openAccountSelector = () => setShowAccountSelector(true);

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        userRole,
        isNewUser,
        balance,
        setUserRole,
        setIsNewUser,
        connectWallet,
        disconnectWallet,
        refreshBalance,
        deductBalance,
        isConnecting,
        showAccountSelector,
        setShowAccountSelector,
        openAccountSelector,
        hardhatAccounts,
        handleAccountSelect,
      }}
    >
      {children}

      {/* Global Account Selector Modal */}
      {showAccountSelector && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={() => setShowAccountSelector(false)}
        >
          <div
            className="bg-background border border-border rounded-xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-2">Select Test Account</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Select a Hardhat account to simulate valid roles.
            </p>

            <div className="space-y-3">
              {hardhatAccounts.map((acc) => (
                <button
                  key={acc.address}
                  onClick={() => handleAccountSelect(acc.address)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="font-medium group-hover:text-primary transition-colors flex items-center gap-2">
                      {acc.label}
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {acc.role}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {acc.address}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <button
                onClick={() => setShowAccountSelector(false)}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

// WalletContext - no default export needed
