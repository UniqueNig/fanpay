// Paystack Inline v2 hook
// Script loaded in index.html: https://js.paystack.co/v2/inline.js
import { useToast } from "../context/ToastContext";

export const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

if (!PAYSTACK_PUBLIC_KEY) {
  console.error("VITE_PAYSTACK_PUBLIC_KEY is not set — payments will fail. Check your .env.");
}

export const usePaystack = () => {
  const { showToast } = useToast();

  const initializePayment = ({ email, amount, metadata, onSuccess, onClose }) => {
    if (!window.PaystackPop) {
      console.error("Paystack script not loaded. Check index.html.");
      showToast("Payment system failed to load. Please refresh and try again.", "error");
      onClose && onClose();
      return;
    }

    // v2 uses `new PaystackPop()` + `.newTransaction()`
    // v2 uses `onSuccess` (not `callback`) and `onCancel` (not `onClose`)
    const popup = new window.PaystackPop();
    popup.newTransaction({
      key: PAYSTACK_PUBLIC_KEY,
      email,
      amount: Math.round(amount * 100), // kobo, must be integer
      currency: "NGN",
      ref: "NB-" + Date.now() + "-" + Math.floor(Math.random() * 100000),
      metadata: {
        custom_fields: metadata || [],
      },
      onSuccess: (response) => {
        onSuccess && onSuccess(response);
      },
      onCancel: () => {
        onClose && onClose();
      },
    });
  };

  return { initializePayment };
};
