# RentSutra - The Modern OS for Your Rental Property

RentSutra is a comprehensive, all-in-one rental management software designed for Paying Guest (PG) accommodations, hostels, and co-living spaces. It simplifies property management by providing a suite of tools to handle everything from tenant onboarding and rent collection to expense tracking and AI-powered communication.

## Key Features

The application is split into two main portals: the **Owner Dashboard** for property managers and the **Tenant Portal** for residents.

---

### 1. Visual Occupancy Dashboard

This is the central hub for property owners, providing a real-time, at-a-glance view of the entire rental business.

-   **What it is:** A dynamic dashboard that visually represents your property's layout (floors, rooms, and beds).
-   **Options Available:**
    -   **Add Guests:** Click on any available bed to start the guest onboarding process.
    -   **View Guest Details:** Hover over an occupied bed to see a popover with key guest information like name, rent status, and due date.
    -   **Perform Actions:** From the popover, you can collect rent, send AI-generated reminders, or initiate the exit process.
    -   **Layout Editing:** An "Edit Mode" switch allows you to modify the property structure on the fly.
-   **Flow:**
    1.  Upon login, the owner lands on the dashboard.
    2.  Key metrics like **Occupancy**, **Collected Rent**, and **Pending Dues** are displayed in stats cards.
    3.  The main view shows a color-coded layout of beds:
        -   **Yellow:** Available
        -   **Gray:** Occupied
        -   **Red:** Rent Pending
        -   **Orange:** Partial Payment
        -   **Blue:** On Notice Period
    4.  Owners can interact with beds to manage guests or toggle "Edit Mode" to manage the property layout itself.

---

### 2. Property & Layout Management

This feature allows owners to create a digital twin of their physical property, making management intuitive.

-   **What it is:** A hierarchical system to define floors, rooms within floors, and beds within rooms.
-   **Options Available:**
    -   **Add/Edit/Delete Floors:** Create new floors (e.g., "First Floor," "Terrace") and edit their names.
    -   **Add/Edit/Delete Rooms:** Add rooms to a floor, specifying the room name/number, rent, and security deposit.
    -   **Add/Edit/Delete Beds:** Add beds to a room, creating different sharing types (e.g., 2-sharing, 3-sharing).
-   **Flow:**
    1.  From the "Property Management" page or the main dashboard's "Edit Mode."
    2.  Click "Add Floor" to create a new floor.
    3.  Within a floor, click "Add Room" to create a new room and set its financial details.
    4.  Within that room, click "Add Bed" one or more times to set the sharing configuration.
    5.  This layout is then reflected on the main dashboard for occupancy management.

---

### 3. Guest (Tenant) Management

A complete lifecycle management tool for your tenants.

-   **What it is:** A centralized system to manage all guest information, from onboarding to exit.
-   **Options Available:**
    -   **Onboarding:** Add new guests with details like name, phone, rent, deposit, and move-in date.
    -   **Profile View:** Each guest has a detailed profile page showing their rent history, stay details, and complaints.
    -   **Rent Collection:** Log full or partial rent payments. The system automatically updates the due date for the next month upon full payment.
    -   **Exit Management:**
        -   **Initiate Exit:** Place a guest on their notice period. The bed is marked accordingly.
        -   **Exit Immediately:** A special option to bypass the notice period and vacate the bed instantly.
-   **Flow:**
    1.  A guest is added to an available bed from the dashboard.
    2.  Their profile is created, and their rent status is automatically tracked.
    3.  When rent is due, the owner can use the popover to collect payment or send a reminder.
    4.  When a guest decides to leave, the owner initiates the exit process, and the system manages the notice period.

---

### 4. Expense Tracking

A simple yet powerful tool to monitor where your money is going.

-   **What it is:** A ledger to record all property-related expenses.
-   **Options Available:**
    -   **Add Expense:** Log new expenses with details like date, category (food, maintenance, etc.), amount, and description.
    -   **Quick Add:** Use preset buttons for common expenses like "Water Bill" or "Groceries" to speed up logging.
    -   **View Summary:** The dashboard shows a summary of total expenses for the current month, broken down by category.
-   **Flow:**
    1.  Navigate to the "Expenses" page.
    2.  Click "Add Expense" or a "Quick Add" button.
    3.  Fill in the details and save.
    4.  The expense is logged, and the monthly summary is updated automatically.

---

### 5. Complaints Management

A transparent system for tracking and resolving tenant issues.

-   **What it is:** A complaint board where tenants can raise issues and owners can track their status.
-   **Options Available:**
    -   **Raise Complaint (Tenant):** Tenants can submit complaints under categories like Maintenance, Wi-Fi, etc.
    -   **Track Status (Owner):** Owners see a list of all complaints and can update the status from "Open" to "In Progress" to "Resolved."
    -   **Upvote:** Other tenants can upvote an existing complaint to show it's a common problem.
-   **Flow:**
    1.  A tenant submits a complaint through their portal.
    2.  The owner sees the new complaint on their dashboard.
    3.  The owner updates the status as they work on resolving the issue.
    4.  The status change is visible to all tenants.

---

### 6. AI-Powered Tools

Leverage artificial intelligence to automate and improve your operations.

-   **AI Rent Reminders:** Automatically generates polite and professional rent reminder messages, personalized with the guest's name, amount due, and PG name.
-   **AI SEO Content Generator:** Helps you market your property by generating SEO-friendly titles and descriptions for online listings based on your property's details.
-   **AI Tenant Chatbot:** Provides tenants with an AI assistant that can answer questions about house rules, menu, and amenities, reducing the owner's support workload.
-   **AI KYC Verification:** (Pro Plan) Uses vision AI to compare a guest's ID document with a live selfie to automatically verify their identity, adding a layer of security.

---

### 7. Tenant Portal

A dedicated space for your guests to manage their stay.

-   **My Property:** View rent due dates, payment status, and stay details.
-   **Food Menu:** Check the weekly food menu.
-   **Complaints:** Raise new complaints and track the status of existing ones.
-   **AI Helper:** Interact with the chatbot for quick answers.
-   **KYC:** Upload documents for verification.
-   **Profile:** Update personal information.
