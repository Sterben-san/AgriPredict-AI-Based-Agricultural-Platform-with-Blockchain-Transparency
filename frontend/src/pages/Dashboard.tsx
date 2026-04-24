import { useWallet } from "@/contexts/WalletContext";
import BuyerDashboard from "@/BuyerDashboard";
import LogisticsDashboard from "@/LogisticsDashboard";

const Dashboard = () => {
  const { userRole, walletAddress, connectWallet, isConnecting } = useWallet();

  if (!walletAddress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Welcome to AgriPredict</h1>
          <p className="text-muted-foreground">Connect your wallet to access the dashboard.</p>
          <button onClick={connectWallet} disabled={isConnecting}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        </div>
      </div>
    );
  }

  if (userRole === "buyer") return <BuyerDashboard />;
  if (userRole === "logistics") return <LogisticsDashboard />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">
          {userRole === "farmer" ? "Farmer Dashboard" : "Setting up your account..."}
        </h1>
        <p className="text-muted-foreground">
          Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
