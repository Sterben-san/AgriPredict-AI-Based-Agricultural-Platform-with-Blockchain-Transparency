import { useWallet } from "@/contexts/WalletContext";
import BuyerDashboard from "../BuyerDashboard";
import LogisticsDashboard from "../LogisticsDashboard";

const Dashboard = () => {
  const { userRole } = useWallet();

  if (userRole === "buyer") return <BuyerDashboard />;
  if (userRole === "logistics") return <LogisticsDashboard />;

  // Default: farmer or no role
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome to AgriPredict</h1>
        <p className="text-gray-500">Connect your wallet to access the dashboard.</p>
      </div>
    </div>
  );
};

export default Dashboard;
