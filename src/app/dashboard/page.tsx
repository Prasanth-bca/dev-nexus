import DashboardHome from "./DashboardHome";

// Force dynamic rendering — child components read from MongoDB
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return <DashboardHome />;
}
