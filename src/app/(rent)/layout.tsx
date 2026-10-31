export default function RentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rent-module-container min-h-screen">
      {children}
    </div>
  );
}

