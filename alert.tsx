import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  Package,
  Wallet,
  Loader2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getOrders, updateOrderStatus, loginUser } from "@/services/api";

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

interface Order {
  id: string;
  productName: string;
  quantity: number;
  buyerAddress: string;
  farmerAddress: string;
  farmerLocation: string;
  buyerLocation: string;
  status: "pending" | "picked_up" | "in_transit" | "delivered";
  createdAt: Date;
  estimatedDelivery: Date;
  txHash: string;
}

const statusConfig: Record<
  Order["status"],
  { label: string; color: string; icon: any }
> = {
  pending: {
    label: "Pending Pickup",
    color: "bg-yellow-500/20 text-yellow-700",
    icon: Clock,
  },
  picked_up: {
    label: "Picked Up",
    color: "bg-blue-500/20 text-blue-700",
    icon: Package,
  },
  in_transit: {
    label: "In Transit",
    color: "bg-purple-500/20 text-purple-700",
    icon: Truck,
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-500/20 text-green-700",
    icon: CheckCircle,
  },
};

const LogisticsDashboard = () => {
  const { walletAddress, connectWallet } = useWallet();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | Order["status"]>(
    "all",
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      // Register/Login as Logistics
      loginUser({
        wallet_address: walletAddress,
        role: "logistics",
      }).catch(console.error);

      fetchOrders();
    }
  }, [walletAddress]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await getOrders();
      // Map API Order to Frontend Order Interface
      // Note: Backend doesn't return productName directly (it's in relation).
      // For Phase 1 simplified, we might miss productName if not joined.
      // But let's assume raw data for now.

      const mappedOrders: Order[] = data.map((o: any) => ({
        id: o.id,
        productName: o.product_name, // Now returned by backend
        quantity: o.quantity,
        buyerAddress: o.buyer_address,
        farmerAddress: o.farmer_address,
        farmerLocation: o.farmer_location,
        buyerLocation: o.buyer_location,
        status: o.status,
        createdAt: new Date(o.created_at),
        estimatedDelivery: new Date(o.estimated_delivery),
        txHash: o.tx_hash,
      }));

      setOrders(mappedOrders);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Failed to refresh orders");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    orderId: string,
    newStatus: Order["status"],
  ) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Order status updated to ${statusConfig[newStatus].label}`);
      fetchOrders(); // Refresh
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const filteredOrders =
    activeFilter === "all"
      ? orders
      : orders.filter((order) => order.status === activeFilter);

  return (
    <div className="space-y-6">
      {/* Logistics Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Truck className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Logistics & Supply Chain</h2>
            <p className="text-muted-foreground">
              Track and manage deliveries with blockchain verification
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchOrders}
            disabled={loading || !walletAddress}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {!walletAddress ? (
        <div className="glass-card p-12 text-center">
          <Truck className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            Connect Wallet to View Orders
          </h3>
          <p className="text-muted-foreground mb-4">
            You need to act as a Logistics Provider to manage shipments.
          </p>
          <Button
            onClick={connectWallet}
            variant="hero"
            className="bg-accent hover:bg-accent/90 text-white"
          >
            Connect Wallet
          </Button>
        </div>
      ) : (
        <>
          {/* Status Filters */}
          <div className="flex flex-wrap gap-2 pb-4">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              onClick={() => setActiveFilter("all")}
              className={
                activeFilter === "all"
                  ? "bg-accent text-white hover:bg-accent/90"
                  : ""
              }
            >
              All Orders
            </Button>
            {(Object.keys(statusConfig) as Order["status"][]).map((status) => (
              <Button
                key={status}
                variant={activeFilter === status ? "default" : "outline"}
                onClick={() => setActiveFilter(status)}
                className={
                  activeFilter === status
                    ? statusConfig[status].color
                        .replace("text-", "bg-")
                        .replace("/20", "") + " text-white"
                    : ""
                }
              >
                {statusConfig[status].label}
              </Button>
            ))}
          </div>

          {/* Orders List */}
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Orders Found</h3>
                <p className="text-muted-foreground">
                  There are no orders matching the current filter.
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const StatusIcon = statusConfig[order.status].icon;
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 border-l-4"
                    style={{
                      borderLeftColor:
                        order.status === "delivered" ? "#22c55e" : "#f59e0b",
                    }} // Simplified color logic
                  >
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Order Info */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-xs font-bold px-2 py-1 rounded-full ${
                                  statusConfig[order.status].color
                                } flex items-center gap-1`}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig[order.status].label}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {order.id}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold">
                              {order.productName} ({order.quantity} kg)
                            </h3>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                <span>From (Farmer):</span>
                              </div>
                              <div className="pl-6">
                                <span className="text-foreground font-medium block">
                                  {order.farmerLocation}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {order.farmerAddress?.slice(0, 6)}...
                                  {order.farmerAddress?.slice(-4)}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                <span>To (Buyer):</span>
                              </div>
                              <div className="pl-6">
                                <span className="text-foreground font-medium block">
                                  {order.buyerLocation}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {order.buyerAddress?.slice(0, 6)}...
                                  {order.buyerAddress?.slice(-4)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Created:{" "}
                                <span className="text-foreground font-medium">
                                  {order.createdAt.toLocaleDateString()}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span>
                                Est. Delivery:{" "}
                                <span className="text-foreground font-medium">
                                  {order.estimatedDelivery.toLocaleDateString()}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col justify-center gap-2 min-w-[200px] border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6">
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Update Status
                        </p>
                        {order.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleUpdateStatus(order.id, "picked_up")
                            }
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Package className="w-4 h-4 mr-2" /> Mark Picked Up
                          </Button>
                        )}
                        {order.status === "picked_up" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleUpdateStatus(order.id, "in_transit")
                            }
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <Truck className="w-4 h-4 mr-2" /> Start Transit
                          </Button>
                        )}
                        {order.status === "in_transit" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleUpdateStatus(order.id, "delivered")
                            }
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> Mark
                            Delivered
                          </Button>
                        )}
                        {order.status === "delivered" && (
                          <div className="text-center p-2 bg-green-500/10 text-green-600 rounded-lg font-medium text-sm">
                            Order Completed
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Account Selector Modal */}
    </div>
  );
};

export default LogisticsDashboard;
