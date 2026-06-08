import { PageLayout } from "../components/site.js";
import { PAGE_CONTEXTS } from "../data/pageContexts.js";
import DonateForm from "./DonateForm.js";

/**
 * Donations (tokans.org/donate). The live page is the static donate.html shell
 * with DonateForm mounted as an island; this React screen wraps the same widget
 * in PageLayout for any SPA fallback.
 */
export default function Donate() {
  return (
    <PageLayout content={PAGE_CONTEXTS["donate"]!}>
      <DonateForm />
    </PageLayout>
  );
}
