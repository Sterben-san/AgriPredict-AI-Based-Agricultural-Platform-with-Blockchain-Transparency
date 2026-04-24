import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, Loader2, UserPlus, Tractor, ShoppingCart, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { loginUser } from "@/services/api";
import { toast } from "sonner";

type Role = "farmer" | "buyer" | "logistics";

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignInClick: () => void;
}

const SignUpModal: React.FC<SignUpModalProps> = ({
  isOpen,
  onClose,
  onSignInClick,
}) => {
  const { handleAccountSelect, hardhatAccounts, setUserRole, setIsNewUser } = useWallet();
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const roles: { id: Role; label: string; icon: React.ElementType; emoji: string }[] = [
    { id: "farmer", label: "Farmer", icon: Tractor, emoji: "🚜" },
    { id: "buyer", label: "Buyer", icon: ShoppingCart, emoji: "🛒" },
    { id: "logistics", label: "Logistics", icon: Truck, emoji: "🚚" },
  ];

  const handleSignUp = async () => {
    if (!selectedAccount || !selectedRole) {
      toast.error("Please select both an account and a role");
      return;
    }

    setIsRegistering(true);
    try {
      // Register user in database
      await loginUser({
        wallet_address: selectedAccount,
        role: selectedRole,
      });

      // Connect wallet and set role
      await handleAccountSelect(selectedAccount);
      setUserRole(selectedRole);
      setIsNewUser(false);

      toast.success(`Welcome! You are now registered as a ${selectedRole}.`);
      onClose();
    } catch (error) {
      console.error("Sign up error:", error);
      toast.error("Failed to sign up. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] overflow-y-auto"
        onClick={onClose}
      >
        <div className="min-h-full flex items-center justify-center p-2 sm:p-3 md:p-4 relative z-[99999]">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-background border border-border rounded-xl p-4 sm:p-5 md:p-6 max-w-lg w-full shadow-2xl my-4 sm:my-6 md:my-8 max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-1.5rem)] md:max-h-[90vh] overflow-y-auto relative z-[99999]"
            onClick={(e) => e.stopPropagation()}
          >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold">Sign Up</h3>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-muted-foreground mb-4 sm:mb-6 text-xs sm:text-sm">
            Create a new account by selecting your wallet and choosing your role.
          </p>

          {/* Step 1: Select Account */}
          <div className="mb-4 sm:mb-6">
            <label className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 block">
              1. Select Your Wallet Account
            </label>
            <div className="space-y-2">
              {hardhatAccounts.length > 0 ? (
                hardhatAccounts.map((acc) => (
                  <button
                    key={acc.address}
                    onClick={() => setSelectedAccount(acc.address)}
                    className={`w-full text-left p-2.5 sm:p-3 rounded-lg border transition-colors ${
                      selectedAccount === acc.address
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="font-medium text-xs sm:text-sm truncate">{acc.label}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground font-mono break-all">
                          {acc.address}
                        </div>
                      </div>
                      {selectedAccount === acc.address && (
                        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin mx-auto mb-2" />
                  <p className="text-xs sm:text-sm">Loading accounts...</p>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Select Role */}
          <div className="mb-4 sm:mb-6">
            <label className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 block">
              2. Choose Your Role
            </label>
            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              {roles.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`p-3 sm:p-4 rounded-lg border transition-all text-left ${
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xl sm:text-2xl flex-shrink-0">{role.emoji}</span>
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isSelected ? "text-primary" : ""}`} />
                      <span className="font-medium flex-1 text-sm sm:text-base">{role.label}</span>
                      {isSelected && (
                        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sign Up Button */}
          <Button
            onClick={handleSignUp}
            disabled={!selectedAccount || !selectedRole || isRegistering}
            className="w-full text-sm sm:text-base"
            size="lg"
          >
            {isRegistering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Create Account
              </>
            )}
          </Button>

          <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-border">
            <p className="text-xs sm:text-sm text-center text-muted-foreground mb-2 sm:mb-3">
              Already have an account?
            </p>
            <Button
              variant="outline"
              className="w-full text-sm sm:text-base"
              onClick={() => {
                onClose();
                onSignInClick();
              }}
            >
              Sign In Instead
            </Button>
          </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default SignUpModal;
