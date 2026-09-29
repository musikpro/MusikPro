import Screen from "@/components/banani/CreditsPurchaseScreen";
import Preview from "@/components/banani/Preview";
import { getSession, isDemoRequest } from "@/lib/auth/session";
import { getCreditPurchaseHistory, type CreditHistoryEntry } from "@/lib/credits/history";

export default async function Page() {
  let history: CreditHistoryEntry[] = [];
  try {
    const session = (await isDemoRequest()) ? null : await getSession();
    if (session?.user) history = await getCreditPurchaseHistory(session.user.id);
  } catch {
    // The history is informative only: never block the credits page if it cannot be read.
  }
  return (
    <Preview>
      <div className="banani-screen ">
        <Screen history={history} />
      </div>
    </Preview>
  );
}
