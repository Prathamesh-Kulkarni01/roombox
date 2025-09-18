
export const trainingGuides = [
    { 
        slug: 'creating-property',
        title: 'How to Create Your First Property',
        description: 'A step-by-step guide on adding your first PG, hostel, or co-living property on RentSutra.',
        content: `
            <h1>How to Create Your First Property on RentSutra</h1>
            <p class="lead">This guide will walk you through the simple process of adding your first property to the RentSutra dashboard.</p>

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

            <div class="my-8 p-4 border-l-4 border-primary bg-muted/50 rounded-r-lg">
                <h3 class="font-semibold">What's Next?</h3>
                <p>After creating your property, the next crucial step is to set up its layout. This means adding floors, rooms, and beds to create a digital twin of your property. Check out our next guide: <a href="/blog/setting-up-layout">Setting up Floors, Rooms & Beds</a>.</p>
            </div>

            <h2>Video Tutorial</h2>
            <p>Watch this short video to see the process in action:</p>
            <div class="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p class="text-muted-foreground">(YouTube video embed placeholder)</p>
            </div>
        `
    },
    {
        slug: 'setting-up-layout',
        title: 'Setting Up Your Property Layout',
        description: 'Learn how to create a digital layout of your property by adding floors, rooms, and beds.',
        content: `
            <h1>Setting Up Your Property Layout (Floors, Rooms & Beds)</h1>
            <p class="lead">Creating a digital twin of your property is the key to efficient management. This guide shows you how to use the Layout Editor.</p>

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

            <div class="my-8 p-4 border-l-4 border-primary bg-muted/50 rounded-r-lg">
                <h3 class="font-semibold">Tip</h3>
                <p>You can always re-enter "Edit Building" mode to make changes, like adding a new room or converting a 2-sharing room to a 3-sharing by adding another bed.</p>
            </div>

            <h2>Video Tutorial</h2>
            <p>Watch this short video to see the layout editor in action:</p>
            <div class="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p class="text-muted-foreground">(YouTube video embed placeholder)</p>
            </div>
        `
    },
    {
        slug: 'onboarding-guest',
        title: 'How to Onboard a New Guest',
        description: 'A complete guide to adding a new tenant to a vacant bed in your property on RentSutra.',
        content: `
            <h1>How to Onboard a New Guest</h1>
            <p class="lead">Adding a guest to a vacant bed is a simple process. This guide covers how to do it directly from your dashboard.</p>

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

            <div class="my-8 p-4 border-l-4 border-primary bg-muted/50 rounded-r-lg">
                <h3 class="font-semibold">Quick Add</h3>
                <p>You can also use the "Add Guest" quick action button at the top of the dashboard. This will show you a list of all available beds across all your properties to choose from.</p>
            </div>

            <h2>Video Tutorial</h2>
            <p>Watch this short video to see how to onboard a new guest:</p>
            <div class="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p class="text-muted-foreground">(YouTube video embed placeholder)</p>
            </div>
        `
    },
    {
        slug: 'collecting-rent',
        title: 'Collecting Rent & Managing Dues',
        description: 'Learn how to collect full or partial rent payments, send reminders, and manage pending dues.',
        content: `
            <h1>Collecting Rent & Managing Dues</h1>
            <p class="lead">RentSutra automates rent tracking and makes collecting payments simple. Here’s how to manage the rent lifecycle.</p>

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
            <div class="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p class="text-muted-foreground">(YouTube video embed placeholder)</p>
            </div>
        `
    },
     {
        slug: 'expense-tracking',
        title: 'How to Use the Expense Tracker',
        description: 'A guide on how to effectively log, categorize, and track all your property-related expenses.',
        content: `
            <h1>How to Use the Expense Tracker</h1>
            <p class="lead">Keeping track of your expenses is crucial for understanding your profitability. RentSutra makes it simple to log every rupee spent.</p>

            <h2>Step 1: Navigate to the Expenses Page</h2>
            <p>From the main sidebar, click on "Expenses". This page provides a summary of your monthly expenses and a log of recent transactions.</p>

            <h2>Step 2: Add a New Expense</h2>
            <p>You have two ways to add an expense:</p>
            <ul>
                <li><strong>Manual Entry:</strong> Click the "Add Expense" button to open a dialog. Here you can specify the property, category, amount, description, and date.</li>
                <li><strong>Quick Add:</strong> Use the "Quick Add" buttons for common, recurring expenses like "Water Bill" or "Groceries". This pre-fills the category and description for you, saving you time.</li>
            </ul>

            <h2>Step 3: Fill in Expense Details</h2>
            <ol>
                <li><strong>Property:</strong> Select which of your properties this expense is for.</li>
                <li><strong>Category:</strong> Choose a category like Food, Maintenance, Utilities, or Salary.</li>
                <li><strong>Amount:</strong> Enter the total amount spent.</li>
                <li><strong>Description:</strong> Add a brief note for your records (e.g., "Electricity bill for June").</li>
                <li><strong>Date:</strong> The date the expense was incurred.</li>
            </ol>
            <p>Once you save the expense, it will be added to your log and the monthly summary on the Expense dashboard will be updated instantly.</p>

            <h2>Step 4: View Summaries</h2>
            <p>The Expense dashboard provides cards that show your total expenses for the current month, broken down by major categories. This helps you see where your money is going at a glance.</p>
            
            <h2>Video Tutorial</h2>
            <p>Watch this video to learn how to manage your expenses with RentSutra:</p>
            <div class="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p class="text-muted-foreground">(YouTube video embed placeholder)</p>
            </div>
        `
    },
    {
        slug: 'managing-staff',
        title: 'Managing Staff & Permissions',
        description: 'Learn how to add staff members and configure what they can see and do on the dashboard.',
        content: `
            <h1>Managing Staff & Permissions</h1>
            <p class="lead">Delegate tasks by adding your staff to RentSutra and giving them role-based access. This feature is available on our Pro plan.</p>

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

            <div class="my-8 p-4 border-l-4 border-primary bg-muted/50 rounded-r-lg">
                <h3 class="font-semibold">Security Tip</h3>
                <p>By default, staff roles have limited permissions. Only grant access to the features that are necessary for their job. For example, a 'cook' only needs access to the Food Menu and possibly a part of the Expenses for logging grocery purchases.</p>
            </div>

            <h2>Video Tutorial</h2>
            <p>Watch this short video to see how to manage staff and permissions:</p>
            <div class="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p class="text-muted-foreground">(YouTube video embed placeholder)</p>
            </div>
        `
    },
    {
        slug: 'setting-up-payouts',
        title: 'Setting Up Bank Payouts',
        description: 'Securely link your bank account or UPI ID to receive automated rent settlements.',
        content: `
            <h1>Setting Up Bank Payouts</h1>
            <p class="lead">Connect your bank account or UPI ID to automate your rent collection process. When tenants pay through the app, the money (minus a small transaction fee) is transferred directly to you.</p>

            <h2>Step 1: Go to Settings</h2>
            <p>Navigate to the "Settings" page from the main dashboard sidebar.</p>

            <h2>Step 2: Find the Payout Settings</h2>
            <p>Locate the card titled "Payout Settings". This is where you can manage your linked accounts.</p>

            <h2>Step 3: Add a Payout Method</h2>
            <p>Click the "Add Method" button. You have two options:</p>
            <ul>
                <li>
                <strong>UPI ID:</strong> Simply enter your UPI ID (e.g., \`yourname@okbank\`). This is the fastest and easiest method. We will validate the UPI ID to ensure it's correct.
                </li>
                <li>
                <strong>Bank Account:</strong> Enter your Account Holder Name, Account Number, and IFSC code. The name must match what's on your bank account.
                </li>
            </ul>
            <p>After you submit, our payment partner (Razorpay) will securely verify and link your account. This process is usually instant.</p>

            <h2>Step 4: Set a Primary Account</h2>
            <p>You can add multiple payout methods. The one marked as <strong>Primary</strong> will be the default account where all your rent collections are sent. If a payout to the primary account fails for any reason, our system will automatically try the next available account.</p>

            <div class="my-8 p-4 border-l-4 border-primary bg-muted/50 rounded-r-lg">
                <h3 class="font-semibold">Security and Fees</h3>
                <p>Your financial details are securely managed by our RBI-compliant payment partner. RentSutra does not store your full bank account numbers. A small, transparent transaction fee is applied to each online payment to cover gateway costs.</p>
            </div>

            <h2>Video Tutorial</h2>
            <p>Watch this short video to see how to set up your payouts:</p>
            <div class="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p class="text-muted-foreground">(YouTube video embed placeholder)</p>
            </div>
        `
    },
    {
        slug: 'using-ai-tools',
        title: 'Using AI-Powered Tools',
        description: 'Leverage RentSutra\'s AI for rent reminders, SEO content, and the tenant chatbot.',
        content: `
            <h1>Using AI-Powered Tools</h1>
            <p class="lead">RentSutra integrates powerful AI to automate and improve your daily operations. Here's how to use the key AI features available in the Pro plan.</p>

            <h2>1. AI Rent Reminders</h2>
            <p>Stop manually typing out rent reminder messages. Let our AI do it for you.</p>
            <ol>
                <li>On the dashboard, click on a guest whose rent is due.</li>
                <li>In the popover, click "Send Reminder".</li>
                <li>An AI-generated message will instantly appear, personalized with the guest's name, amount due, and your PG's name. It also includes a secure payment link.</li>
                <li>You can copy the message or send it directly via WhatsApp.</li>
            </ol>

            <h2>2. AI SEO Content Generator</h2>
            <p>Attract more tenants by creating professional online listings. This tool helps you write SEO-friendly titles and descriptions.</p>
            <ol>
                <li>Navigate to the "AI SEO" page from the sidebar.</li>
                <li>Fill in the basic details of your property: Name, Location, Amenities, Price, and Gender restrictions.</li>
                <li>Click "Generate Content".</li>
                <li>The AI will produce a compelling title and a detailed, keyword-rich description perfect for platforms like 99acres, MagicBricks, or Facebook.</li>
            </ol>
            
            <h2>3. AI Tenant Chatbot</h2>
            <p>Reduce your support workload by letting an AI handle common tenant questions. Your tenants can access this feature in their app.</p>
            <ul>
                <li><strong>What it does:</strong> The chatbot can answer questions about house rules, meal times, the food menu, and available amenities.</li>
                <li><strong>How it works:</strong> The AI uses the information you've already entered into RentSutra (your rules, your menu) as its source of knowledge.</li>
                <li><strong>Your role:</strong> Simply keep your property details up-to-date, and the chatbot will do the rest!</li>
            </ul>

            <h2>4. Automated KYC Verification</h2>
            <p>Secure your property by verifying tenant identities with AI.</p>
            <ol>
                <li>When a tenant uploads their ID document and a selfie, our AI gets to work.</li>
                <li>It automatically checks if the document is a valid ID and if the selfie matches the photo on the ID.</li>
                <li>You get a clear "Verified" or "Rejected" status on the guest's profile, saving you the manual effort of comparison.</li>
            </ol>

            <h2>Video Tutorial</h2>
            <p>Watch this video to see our AI tools in action:</p>
            <div class="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p class="text-muted-foreground">(YouTube video embed placeholder)</p>
            </div>
        `
    },
];
