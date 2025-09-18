import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Collecting Rent & Managing Dues | RentSutra Guide',
  description: 'Learn how to collect full or partial rent payments, send reminders, and manage pending dues for your tenants using RentSutra.',
};

export default function CollectingRentGuide() {
  return (
    <>
      <h1>Collecting Rent & Managing Dues</h1>
      <p className="lead">RentSutra automates rent tracking and makes collecting payments simple. Here’s how to manage the rent lifecycle.</p>

      <h2>Identifying Due Payments</h2>
      <p>On your dashboard, beds with pending rent are highlighted in red or orange, making them easy to spot. You can also visit the "Rentbook" page for a detailed list of all tenants with pending dues.</p>

      <h2>Step 1: Collect a Payment</h2>
      <ol>
        <li>Click on an occupied bed on the dashboard to open the guest popover.</li>
        <li>Click the "Collect Rent" button.</li>
        <li>A dialog will open showing the total amount due, including any previous balance.</li>
        <li>Enter the amount you are collecting. You can collect the full amount or a partial payment.</li>
        <li>Select the payment method (e.g., Cash, UPI).</li>
        <li>Click "Confirm Payment".</li>
      </ol>
      <p>The guest's rent status and the bed's color on the dashboard will update automatically.</p>

       <h2>Step 2: Sending Reminders</h2>
      <p>If a guest's rent is overdue, you can send them a polite, AI-generated reminder.</p>
       <ol>
        <li>Click on the overdue bed to open the guest popover.</li>
        <li>Click the "Send Reminder" button.</li>
        <li>An AI-generated message in both English and Hindi will appear, complete with a secure payment link.</li>
        <li>You can copy this message or click the button to send it directly via WhatsApp.</li>
      </ol>

       <h2>Step 3: Handling Rent Cycles</h2>
      <p>Once a full rent payment is recorded for a cycle, RentSutra automatically does the following:</p>
      <ul>
        <li>Marks the rent status as "Paid".</li>
        <li>Calculates any carry-forward balance (if they overpaid).</li>
        <li>Advances the due date to the next month.</li>
      </ul>
      <p>This ensures you are always ready for the next rent cycle without any manual date changes.</p>

      <h2>Video Tutorial</h2>
      <p>Watch this video to see rent collection in action:</p>
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">(YouTube video embed placeholder)</p>
      </div>
    </>
  );
}
