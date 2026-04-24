import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Package,
  Wallet,
  CheckCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getProducts, createOrder, loginUser } from "@/services/api";
import { formatETH, formatINR } from "@/utils/currency";
import { ETH_TO_INR_RATE } from "@/contexts/WalletContext";
import type { Product } from "./FarmerDashboard";
import { ethers } from "ethers";

// Ethereum provider type
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const BuyerDashboard = () => {
  const { walletAddress, refreshBalance } = useWallet();
  /* Note: To use deductBalance, we need to destructure it from useWallet.
     Currently useWallet is consumed at higher level or we need to access it here.
     BuyerDashboard doesn't seem to destructure useWallet at top level in the visible snippet?
     Let's check line 20-30 of BuyerDashboard.
     Assume it IS available or I need to add it. */
  // Actually, I can't check line 20-30 in this call. I will assume I need to add it or use it inside handleBuy if hook rules allow?
  // No, useWallet hook must be top level.
  // I will check file first. I'll abort this specific replace call and view file.
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isTransacting, setIsTransacting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Shipping State
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  // Sync global wallet to Buyer Role
  useEffect(() => {
    if (walletAddress) {
      loginUser({
        wallet_address: walletAddress,
        role: "buyer",
      }).catch(console.error);
    }
  }, [walletAddress]);

  const fetchProducts = async () => {
    try {
      const data = await getProducts();
      // Map API response (snake_case) to Frontend Product interface (camelCase)
      const mappedProducts: Product[] = data.map((p: any) => ({
        id: p.id,
        cropType: p.crop_type,
        commodityGroup: p.commodity_group,
        quantity: p.quantity,
        price: p.price,
        suggestedPrice: p.suggested_price,
        qualityGrade: p.quality_grade,
        marketLocation: p.market_location,
        state: p.state,
        season: p.season,
        farmerAddress: p.farmer_address,
        transportCost: p.transport_cost || 0,
        createdAt: new Date(p.created_at),
      }));
      setProducts(mappedProducts);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const handleBuy = (product: Product) => {
    if (!walletAddress) {
      toast.error("Please connect your wallet first!");
      return;
    }
    setSelectedProduct(product);
    setShowShippingModal(true);
  };

  const confirmPurchase = async () => {
    if (!selectedProduct) return;
    if (!shippingAddress || !phoneNumber) {
      toast.error("Please fill in all shipping details");
      return;
    }

    if (!walletAddress) {
      toast.error("Please connect your wallet first!");
      return;
    }

    setIsTransacting(true);
    setTxHash(null);

    try {
      // Calculate Total Price (crop price + transport cost)
      const cropPrice = selectedProduct.price * selectedProduct.quantity;
      const transportCost = selectedProduct.transportCost || 0;
      const totalINR = cropPrice + transportCost;
      const totalETH = totalINR / ETH_TO_INR_RATE;

      // Use ethers.js to properly format the value
      const weiValue = ethers.parseEther(totalETH.toFixed(18));

      let txHash = "";
      let provider: ethers.BrowserProvider | ethers.JsonRpcProvider;
      let signer: ethers.JsonRpcSigner | ethers.Wallet;

      // Check if MetaMask is available
      if (typeof window.ethereum !== "undefined") {
        // Use MetaMask provider
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        provider = browserProvider;
        signer = await browserProvider.getSigner();
        
        // Verify the signer address matches the connected wallet
        const signerAddress = await signer.getAddress();
        if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          throw new Error("Connected wallet address doesn't match signer address");
        }

        // Send ETH directly to farmer
        const tx = await signer.sendTransaction({
          to: selectedProduct.farmerAddress,
          value: weiValue,
        });

        txHash = tx.hash;
        setTxHash(txHash);

        // Wait for transaction to be mined
        await tx.wait();
        toast.success("Transaction confirmed!");
      } else {
        // Fallback: Use Hardhat local node
        provider = new ethers.JsonRpcProvider(import.meta.env.VITE_BLOCKCHAIN_URL || "http://localhost:8545");
        
        // For Hardhat local node, we need to use eth_sendTransaction
        // which auto-signs for accounts it manages
        const response = await fetch(import.meta.env.VITE_BLOCKCHAIN_URL || "http://localhost:8545", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_sendTransaction",
            params: [
              {
                from: walletAddress,
                to: selectedProduct.farmerAddress,
                value: `0x${weiValue.toString(16)}`,
                gas: "0x5208", // 21000 gas for simple transfer
              },
            ],
            id: 1,
          }),
        });

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error.message || "Transaction failed");
        }
        txHash = data.result;
        setTxHash(txHash);

        // Wait for block mining (Hardhat mines instantly, but wait a bit for state update)
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Save Order to Backend
      const orderId = `ORD-${Date.now()}`;
      await createOrder({
        id: orderId,
        product_id: selectedProduct.id,
        buyer_address: walletAddress!,
        quantity: selectedProduct.quantity,
        total_price: cropPrice + transportCost,
        farmer_location: `${selectedProduct.marketLocation}, ${selectedProduct.state}`,
        buyer_location: `${shippingAddress} (Phone: ${phoneNumber})`,
        tx_hash: txHash,
      });

      toast.success("Transaction submitted & Order Created!");

      // Refresh balance and products
      await refreshBalance();
      fetchProducts();
      setShowShippingModal(false);
    } catch (error: any) {
      console.error("Transaction error:", error);
      toast.error(error.message || "Transaction failed");
      // Don't close modal on error so they can retry
    } finally {
      setIsTransacting(false);
    }
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setTxHash(null);
  };

  return (
    <div className="space-y-6">
      {/* Buyer Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-secondary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Buyer Marketplace</h2>
            <p className="text-muted-foreground">
              Browse and purchase crops directly from farmers
            </p>
          </div>
        </div>

        {/* Connect Wallet Widget Removed (In Navbar now) */}
      </div>

      <div className="glass-card p-6 border-secondary/20 bg-secondary/5 mb-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-secondary" />
          Blockchain-Enabled Secured Process
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="text-secondary font-bold text-xs uppercase tracking-wider">
              Verification (Provenance)
            </div>
          </div>
          <div className="space-y-1 text-center md:text-left">
            <div className="text-secondary font-bold text-xs uppercase tracking-wider">
              Settlement (Smart Contracts)
            </div>
          </div>
          <div className="space-y-1 text-center md:text-left">
            <div className="text-secondary font-bold text-xs uppercase tracking-wider">
              Transparency (Shared Ledger)
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Products Available</h3>
          <p className="text-muted-foreground">
            Check back later when farmers list their crops for sale
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {product.commodityGroup}
                </span>
              </div>
              <h3 className="text-lg font-bold mb-2">{product.cropType}</h3>
              <div className="space-y-2 text-sm text-muted-foreground mb-4">
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span className="font-medium text-foreground">
                    {product.quantity} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Quality:</span>
                  <span className="font-medium text-foreground">
                    {product.qualityGrade}/5
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span className="font-medium text-foreground">
                    {product.marketLocation}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Season:</span>
                  <span className="font-medium text-foreground">
                    {product.season}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Transport Cost:</span>
                  <span className="font-medium text-foreground">
                    ₹{(product.transportCost || 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="border-t border-border pt-4 mb-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    Selling Price:
                  </span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-primary">
                      {Number(product.price).toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                      })}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        / kg
                      </span>
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      ({formatETH(Number(product.price) / ETH_TO_INR_RATE)})
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant={
                  product.farmerAddress === walletAddress ? "outline" : "hero"
                }
                className={
                  product.farmerAddress === walletAddress
                    ? "w-full cursor-not-allowed opacity-70"
                    : "w-full bg-secondary hover:bg-secondary/90"
                }
                onClick={() => handleBuy(product)}
                disabled={
                  (isTransacting && selectedProduct?.id === product.id) ||
                  product.farmerAddress === walletAddress
                }
              >
                {isTransacting && selectedProduct?.id === product.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : product.farmerAddress === walletAddress ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Your Listing
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Buy Now
                  </>
                )}
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Shipping Modal */}
      <AnimatePresence>
        {showShippingModal && selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowShippingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">Confirm Purchase</h3>
              <div className="space-y-4">
                <div className="bg-muted/20 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Product</p>
                  <p className="font-semibold">{selectedProduct.cropType}</p>
                  <p className="text-sm">
                    {selectedProduct.quantity} kg @ ₹{selectedProduct.price}/kg
                  </p>
                  <div className="mt-2 border-t border-border/50 pt-2 space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>Crop Cost:</span>
                      <span>
                        ₹{(selectedProduct.price * selectedProduct.quantity).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Transport Cost:</span>
                      <span>
                        ₹{(selectedProduct.transportCost || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-border/50 pt-2">
                      <span className="font-bold text-primary">Total:</span>
                      <span className="text-lg font-bold text-primary">
                        {(
                          (selectedProduct.price * selectedProduct.quantity) +
                          (selectedProduct.transportCost || 0)
                        ).toLocaleString("en-IN", {
                          style: "currency",
                          currency: "INR",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Approx. Deduction:</span>
                      <span className="font-mono">
                        {formatETH(
                          ((selectedProduct.price * selectedProduct.quantity) +
                           (selectedProduct.transportCost || 0)) /
                            ETH_TO_INR_RATE,
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Shipping Address
                  </label>
                  <textarea
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter delivery address..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="+91..."
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowShippingModal(false)}
                    disabled={isTransacting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="hero"
                    className="flex-1 bg-secondary hover:bg-secondary/90"
                    onClick={confirmPurchase}
                    disabled={isTransacting}
                  >
                    {isTransacting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm & Pay
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction Modal */}
      <AnimatePresence>
        {selectedProduct && txHash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  Transaction Submitted!
                </h3>
                <p className="text-muted-foreground mb-6">
                  Your purchase of {selectedProduct.cropType} has been submitted
                  to the blockchain.
                </p>

                <div className="glass-card p-4 bg-muted/20 mb-6">
                  <p className="text-xs text-muted-foreground mb-1">
                    Transaction Hash
                  </p>
                  <p className="text-sm font-mono break-all">{txHash}</p>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={closeModal}
                  >
                    Close
                  </Button>
                  <Button
                    variant="hero"
                    className="flex-1"
                    onClick={() =>
                      window.open(`https://etherscan.io/tx/${txHash}`, "_blank")
                    }
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on Etherscan
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BuyerDashboard;
