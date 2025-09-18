import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Create Your First Property | RentSutra Guide',
  description: 'A step-by-step guide on adding your first PG, hostel, or co-living property on RentSutra. Learn how to set the name, location, and basic details.',
};

export default function CreatingPropertyGuide() {
  return (
    <>
      <h1>How to Create Your First Property on RentSutra</h1>
      <p className="lead">This guide will walk you through the simple process of adding your first property to the RentSutra dashboard.</p>

      <h2>Step 1: Navigate to Property Management</h2>
      <p>From your main dashboard, find the "Properties" tab in the sidebar menu and click on it. This will take you to the property management page where you can see all your existing properties.</p>

      <h2>Step 2: Add a New Property</h2>
      <p>Click on the "Add New Property" button. This will open a side panel where you can enter the basic details of your property.</p>
      <ul>
        <li><strong>Property Name:</strong> Give your property a clear and recognizable name (e.g., "Sunshine Boys Hostel").</li>
        <li><strong>Location / Area:</strong> Enter the neighborhood or area where the property is located (e.g., "Koramangala 5th Block").</li>
        <li><strong>City:</strong> Enter the city (e.g., "Bangalore").</li>
        <li><strong>Gender:</strong> Select if the property is for males, females, or co-ed.</li>
      </ul>

      <h2>Step 3: Save Your Property</h2>
      <p>Once you've filled in the details, click the "Add Property" button. Your new property will now appear in your list, and you'll be automatically redirected to the layout setup page for it.</p>

      <div className="my-8 p-4 border-l-4 border-primary bg-muted/50 rounded-r-lg">
        <h3 className="font-semibold">What's Next?</h3>
        <p>After creating your property, the next crucial step is to set up its layout. This means adding floors, rooms, and beds to create a digital twin of your property. Check out our next guide: <a href="/blog/setting-up-layout">Setting up Floors, Rooms & Beds</a>.</p>
      </div>

      <h2>Video Tutorial</h2>
      <p>Watch this short video to see the process in action:</p>
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">(YouTube video embed placeholder)</p>
      </div>
    </>
  );
}
