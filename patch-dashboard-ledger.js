const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/app/dashboard/tenant-management/[guestId]/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add imports
if (!content.includes('getFinancialEvents')) {
    content = content.replace(
        `import { getDoc, doc } from "firebase/firestore";`,
        `import { getDoc, doc } from "firebase/firestore";\nimport { getFinancialEvents } from "@/lib/actions/financialActions";\nimport type { FinancialEvent } from "@/lib/types";`
    );
}

// 2. Add state for financialEvents
if (!content.includes('const [financialEvents')) {
    content = content.replace(
        `const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);`,
        `const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);\n  const [financialEvents, setFinancialEvents] = useState<FinancialEvent[]>([]);\n  const [loadingEvents, setLoadingEvents] = useState(true);`
    );
}

// 3. Add useEffect to fetch events
if (!content.includes('fetchEvents() {')) {
    content = content.replace(
        `useEffect(() => {
    if (guestId) {
      setIsAttendanceLoading`,
        `useEffect(() => {
    async function fetchEvents() {
      if (guest && currentUser) {
         setLoadingEvents(true);
         const res = await getFinancialEvents(currentUser.id, guest.id);
         if (res.success && res.events) {
             setFinancialEvents(res.events);
         }
         setLoadingEvents(false);
      }
    }
    fetchEvents();
  }, [guest, currentUser]);

  useEffect(() => {
    if (guestId) {
      setIsAttendanceLoading`
    );
}

// 4. Update the dueItems calculation
content = content.replace(
    /const ledger = \[\.\.\.\(guest\.ledger \|\| \[\]\)\]\.sort\([\s\S]*?\);/,
    `const ledger = financialEvents.map(e => ({
      id: e.id,
      type: (e.type === 'deposit_received' || e.amount < 0 || e.type === 'payment_received') ? 'credit' : 'debit',
      amountType: 'numeric',
      amount: Math.abs(e.amount),
      description: e.description,
      date: e.date
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());`
);

// 5. Update the Ledger tab to render financialEvents instead of guest.ledger
content = content.replace(
    /\{guest\.ledger && guest\.ledger\.length > 0 \? \([\s\S]*?No transactions recorded yet/g,
    `{financialEvents.length > 0 ? (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {financialEvents.map((entry) => {
                              const isCharge = entry.amount > 0 && entry.type !== 'deposit_received';
                              return (
                                <TableRow key={entry.id}>
                                  <TableCell className="whitespace-nowrap">
                                    {format(parseISO(entry.date), "MMM d, yyyy")}
                                  </TableCell>
                                  <TableCell>
                                    <span className="capitalize text-xs px-2 py-1 bg-secondary rounded-full">
                                      {entry.type.replace('_', ' ')}
                                    </span>
                                  </TableCell>
                                  <TableCell>{entry.description}</TableCell>
                                  <TableCell
                                    className={cn(
                                      "text-right font-medium",
                                      isCharge
                                        ? "text-destructive"
                                        : "text-green-600",
                                    )}
                                  >
                                    {isCharge ? "+" : "-"}₹
                                    {Math.abs(entry.amount).toLocaleString("en-IN")}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        <History className="mx-auto h-12 w-12 opacity-20 mb-4" />
                        No transactions recorded yet`
);


fs.writeFileSync(file, content, 'utf8');
console.log('Dashboard Ledger tab patched successfully.');
