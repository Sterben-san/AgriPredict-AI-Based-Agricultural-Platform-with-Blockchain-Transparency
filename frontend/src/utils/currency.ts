export const ETH_TO_INR_RATE = 291553.48;

export const formatINR = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatETH = (amount: number): string => {
  return `${amount.toFixed(6)} ETH`;
};

export const ethToINR = (eth: number): number => {
  return eth * ETH_TO_INR_RATE;
};

export const inrToETH = (inr: number): number => {
  return inr / ETH_TO_INR_RATE;
};
