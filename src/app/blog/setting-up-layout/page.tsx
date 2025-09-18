import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Setting Up Your Property Layout | RentSutra Guide',
  description: 'Learn how to create a digital layout of your property by adding floors, rooms, and beds on RentSutra for easy visual management.',
};

export default function SettingUpLayoutGuide() {
  return (
    <>
      <h1>Setting Up Your Property Layout (Floors, Rooms & Beds)</h1>
      <p className="lead">Creating a digital twin of your property is the key to efficient management. This guide shows you how to use the Layout Editor.</p>

      <h2>Step 1: Enter "Edit Building" Mode</h2>
      <p>From the main dashboard, find and click the "Edit Building" switch. This will activate the layout editor, allowing you to add, edit, and delete structural components of your property.</p>

      <h2>Step 2: Add Floors</h2>
      <p>If your property has multiple levels, start by adding floors.</p>
      <ol>
        <li>Click the "Add New Floor" button.</li>
        <li>A dialog will appear. Enter a name for your floor (e.g., "Ground Floor", "First Floor", "Terrace").</li>
        <li>Click "Add Floor". Repeat this for all the floors in your property.</li>
      </ol>

      <h2>Step 3: Add Rooms to a Floor</h2>
      <p>Within each floor, you can now add rooms.</p>
      <ol>
        <li>Inside a floor section, click the "Add New Room" button.</li>
        <li>Fill in the room details: room name/number, rent per bed, and security deposit per bed.</li>
        <li>Click "Add Room". The new room card will appear on the floor.</li>
      </ol>

      <h2>Step 4: Add Beds to a Room</h2>
      <p>Finally, add beds to each room to define its sharing capacity.</p>
      <ol>
        <li>Inside a room card, click the "Add Bed" button.</li>
        <li>Enter a name or number for the bed (e.g., "A", "B", "1", "2").</li>
        <li>Click "Add Bed".</li>
        <li>Repeat this process for the number of beds in that room. For a 3-sharing room, you would add 3 beds.</li>
      </ol>

      <h2>Step 5: Exit Edit Mode</h2>
      <p>Once you are done setting up the layout, simply click the "Done" button (which was previously "Edit Building"). Your dashboard will now reflect the visual layout you just created, ready for you to start adding guests!</p>

      <div className="my-8 p-4 border-l-4 border-primary bg-muted/50 rounded-r-lg">
        <h3 className="font-semibold">Tip</h3>
        <p>You can always re-enter "Edit Building" mode to make changes, like adding a new room or converting a 2-sharing room to a 3-sharing by adding another bed.</p>
      </div>

       <h2>Video Tutorial</h2>
      <p>Watch this short video to see the layout editor in action:</p>
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">(YouTube video embed placeholder)</p>
      </div>
    </>
  );
}
