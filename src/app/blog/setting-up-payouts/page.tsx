import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Setting Up Bank Payouts | RentSutra Guide',
  description: 'Learn how to securely link your bank account or UPI ID on RentSutra to receive automated rent settlements from your tenants.',
};

export default function PayoutsGuide() {
  return (
    <>
      <h1>Setting Up Bank Payouts</h1>
      <p className="lead">Connect your bank account or UPI ID to automate your rent collection process. When tenants pay through the app, the money (minus a small transaction fee) is transferred directly to you.</p>

      <h2>Step 1: Go to Settings</h2>
      <p>Navigate to the "Settings" page from the main dashboard sidebar.</p>

      <h2>Step 2: Find the Payout Settings</h2>
      <p>Locate the card titled "Payout Settings". This is where you can manage your linked accounts.</p>

      <h2>Step 3: Add a Payout Method</h2>
      <p>Click the "Add Method" button. You have two options:</p>
      <ul>
        <li>
          <strong>UPI ID:</strong> Simply enter your UPI ID (e.g., `yourname@okbank`). This is the fastest and easiest method. We will validate the UPI ID to ensure it's correct.
        </li>
        <li>
          <strong>Bank Account:</strong> Enter your Account Holder Name, Account Number, and IFSC code. The name must match what's on your bank account.
        </li>
      </ul>
      <p>After you submit, our payment partner (Razorpay) will securely verify and link your account. This process is usually instant.</p>

      <h2>Step 4: Set a Primary Account</h2>
      <p>You can add multiple payout methods. The one marked as **Primary** will be the default account where all your rent collections are sent. If a payout to the primary account fails for any reason, our system will automatically try the next available account.</p>

      <div className="my-8 p-4 border-l-4 border-primary bg-muted/50 rounded-r-lg">
          <h3 className="font-semibold">Security and Fees</h3>
          <p>Your financial details are securely managed by our RBI-compliant payment partner. RentSutra does not store your full bank account numbers. A small, transparent transaction fee is applied to each online payment to cover gateway costs.</p>
      </div>

       <h2>Video Tutorial</h2>
      <p>Watch this short video to see how to set up your payouts:</p>
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">(YouTube video embed placeholder)</p>
      </div>
    </>
  );
}
