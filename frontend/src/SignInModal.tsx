import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { getUserRole } from "@/services/api";
import { toast } from "sonner";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignUpClick: () => void;
}

const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  onSignUpClick,
}) => {
  const { handleAccountSelect, hardhatAccounts } = useWallet();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSignIn = async (address: string) => {
    setIsAuthenticating(true);
    try {
      // Check if user exists in database
      const data = await getUserRole(address);
      if (data.role) {
        // User exists, authenticate them
        await handleAccountSelect(address);
        toast.success("Signed in successfully!");
        onClose();
      } else {
        // User doesn't exist, redirect to sign up
        toast.info("Account not found. Please sign up first.");
        onClose();
        onSignUpClick();
      }
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error("Failed to sign in. Please try again.");
    } finally {
      setIsAuthenticating(false);
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
            className="bg-background border border-border rounded-xl p-4 sm:p-5 md:p-6 max-w-md w-full shadow-2xl my-4 sm:my-6 md:my-8 max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-1.5rem)] md:max-h-[90vh] overflow-y-auto relative z-[99999]"
            onClick={(e) => e.stopPropagation()}
          >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <LogIn className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold">Sign In</h3>
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
            Select your wallet account to sign in to your existing account.
          </p>

          <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
            {hardhatAccounts.length > 0 ? (
              hardhatAccounts.map((acc) => (
                <button
                  key={acc.address}
                  onClick={() => handleSignIn(acc.address)}
                  disabled={isAuthenticating}
                  className="w-full text-left p-3 sm:p-4 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed gap-2 sm:gap-3"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="font-medium text-sm sm:text-base group-hover:text-primary transition-colors truncate">
                        {acc.label}
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground font-mono break-all">
                        {acc.address}
                      </div>
                    </div>
                  </div>
                  {isAuthenticating && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading accounts...</p>
              </div>
            )}
          </div>

          <div className="pt-3 sm:pt-4 border-t border-border">
            <p className="text-xs sm:text-sm text-center text-muted-foreground mb-2 sm:mb-3">
              Don't have an account?
            </p>
            <Button
              variant="outline"
              className="w-full text-sm sm:text-base"
              onClick={() => {
                onClose();
                onSignUpClick();
              }}
            >
              Sign Up Instead
            </Button>
          </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default SignInModal;
