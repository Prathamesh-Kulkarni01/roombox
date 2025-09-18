import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Managing Staff & Permissions | RentSutra Guide',
  description: 'Learn how to add staff members like managers, cooks, or cleaners to RentSutra and configure what they can see and do on the dashboard.',
};

export default function ManagingStaffGuide() {
  return (
    <>
      <h1>Managing Staff & Permissions</h1>
      <p className="lead">Delegate tasks by adding your staff to RentSutra and giving them role-based access. This feature is available on our Pro plan.</p>

      <h2>Step 1: Go to the Staff Management Page</h2>
      <p>From the sidebar menu, click on "Staff". This page lists all your current staff members.</p>

      <h2>Step 2: Add a New Staff Member</h2>
      <ol>
        <li>Click the "Add Staff" button.</li>
        <li>Fill in the staff member's details: Name, Phone, Email, Role (e.g., manager, cook), and the Property they are assigned to.</li>
        <li>An invitation with a sign-in link will be sent to their email address.</li>
      </ol>

      <h2>Step 3: Customizing Permissions</h2>
      <p>You have granular control over what each staff role can do.</p>
      <ol>
        <li>Go to the "Settings" page and find the "Role Management" section.</li>
        <li>Click "Edit Permissions" for a role like 'manager' or 'cook'.</li>
        <li>A dialog will appear listing all features (e.g., Guests, Finances, Food Menu).</li>
        <li>Use the checkboxes to grant or revoke specific permissions, such as viewing guest details, adding expenses, or editing the food menu.</li>
        <li>Click "Save Permissions". The changes will apply to all staff members assigned to that role.</li>
      </ol>

      <div className="my-8 p-4 border-l-4 border-primary bg-muted/50 rounded-r-lg">
          <h3 className="font-semibold">Security Tip</h3>
          <p>By default, staff roles have limited permissions. Only grant access to the features that are necessary for their job. For example, a 'cook' only needs access to the Food Menu and possibly a part of the Expenses for logging grocery purchases.</p>
      </div>

      <h2>Video Tutorial</h2>
      <p>Watch this short video to see how to manage staff and permissions:</p>
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">(YouTube video embed placeholder)</p>
      </div>
    </>
  );
}
