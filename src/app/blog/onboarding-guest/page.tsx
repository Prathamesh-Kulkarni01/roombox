import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Onboard a New Guest | RentSutra Guide',
  description: 'A complete guide to adding a new tenant to a vacant bed in your property on RentSutra, including setting their rent, deposit, and move-in date.',
};

export default function OnboardingGuestGuide() {
  return (
    <>
      <h1>How to Onboard a New Guest</h1>
      <p className="lead">Adding a guest to a vacant bed is a simple process. This guide covers how to do it directly from your dashboard.</p>

      <h2>Step 1: Find a Vacant Bed</h2>
      <p>On your main dashboard, look for a bed that is marked as "Available" (typically yellow). These are the empty beds you can assign to a new guest.</p>

      <h2>Step 2: Open the "Add Guest" Dialog</h2>
      <p>Click on any available bed. This will open the "Onboard New Guest" dialog, pre-filled with the details of the room you selected.</p>

      <h2>Step 3: Fill in the Guest's Details</h2>
      <p>You will need to provide the following information for the new guest:</p>
      <ul>
        <li><strong>Full Name:</strong> The tenant's full name.</li>
        <li><strong>Phone Number:</strong> Their 10-digit mobile number.</li>
        <li><strong>Email Address:</strong> An invitation link will be sent to this email, allowing them to access the tenant portal.</li>
        <li><strong>Monthly Rent:</strong> This is pre-filled from the room's settings but can be adjusted for this specific guest.</li>
        <li><strong>Security Deposit:</strong> Also pre-filled, but you can change it if needed.</li>
        <li><strong>Move-in Date:</strong> The date the guest officially starts their stay. Their first rent cycle will be calculated based on this date.</li>
      </ul>

      <h2>Step 4: Add the Guest</h2>
      <p>After filling in all the details, click the "Add Guest" button. The guest will be added, and the bed on your dashboard will now show as "Occupied". An email invite will be sent to them automatically.</p>

      <div className="my-8 p-4 border-l-4 border-primary bg-muted/50 rounded-r-lg">
          <h3 className="font-semibold">Quick Add</h3>
          <p>You can also use the "Add Guest" quick action button at the top of the dashboard. This will show you a list of all available beds across all your properties to choose from.</p>
      </div>

      <h2>Video Tutorial</h2>
      <p>Watch this short video to see how to onboard a new guest:</p>
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">(YouTube video embed placeholder)</p>
      </div>
    </>
  );
}
