# 🌾 AgriInsights 2026 - Frontend

React-based frontend application for the AgriPredict agricultural marketplace platform. Includes blockchain integration with Hardhat and smart contracts.

## ✨ Features

- 🎨 **Modern UI**: Built with React 18, TypeScript, and Tailwind CSS
- 🔐 **Blockchain Integration**: Wallet authentication and Ethereum transactions
- 👥 **Role-Based Dashboards**: Separate views for Farmers, Buyers, and Logistics
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile
- ⚡ **Fast Development**: Vite for lightning-fast builds

## 🛠️ Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui** components
- **Ethers.js** for blockchain interactions
- **Framer Motion** for animations
- **React Query** for state management
- **Hardhat** for smart contract development
- **Solidity** for smart contracts

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Hardhat Local Blockchain

Open a terminal and run:

```bash
npx hardhat node
```

This starts a local Ethereum node on `http://localhost:8545` with 20 test accounts.

**Keep this terminal running** - you'll need it for transactions.

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:8080`

## 🔗 Backend API

This frontend requires the backend API to be running. 

**Backend Repository**: [Link to backend repo]

**Backend URL**: `http://localhost:8000` (default)

To change the API URL, update `src/services/api.ts`:

```typescript
const API_BASE_URL = "http://your-backend-url:8000";
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/      # React components
│   │   ├── auth/       # Authentication modals
│   │   ├── dashboard/  # Role-specific dashboards
│   │   └── ui/         # shadcn/ui components
│   ├── contexts/       # React contexts
│   ├── pages/          # Page components
│   ├── services/       # API service functions
│   └── utils/          # Utility functions
├── contracts/          # Solidity smart contracts
├── scripts/            # Hardhat scripts
├── test/               # Tests
└── ignition/           # Hardhat Ignition modules
```

## 🧪 Testing

```bash
# Run Hardhat tests
npx hardhat test

# Run Solidity tests only
npx hardhat test solidity

# Run TypeScript/Mocha tests
npx hardhat test mocha
```

## 🏗️ Building for Production

```bash
# Build
npm run build

# Preview production build
npm run preview
```

## 🔐 Hardhat Test Accounts

When running `npx hardhat node`, you get 20 test accounts:

- **Account #0** - Farmer (default)
- **Account #1** - Buyer (default)
- **Account #2** - Logistics (default)

Each account starts with 10,000 ETH for testing.

## 📝 Environment Variables

Create a `.env` file for production:

```env
VITE_API_BASE_URL=http://your-backend-url:8000
VITE_HARDHAT_NODE_URL=http://localhost:8545
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License
