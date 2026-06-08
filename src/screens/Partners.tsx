import { PageLayout } from "../components/site.js";
import { PAGE_CONTEXTS } from "../data/pageContexts.js";
import PartnersDirectory from "./PartnersDirectory.js";

/**
 * Public partner directory (/partners). The live page is the static
 * partners.html shell with PartnersDirectory mounted as an island; this React
 * screen wraps the same widget in PageLayout for any SPA fallback.
 */
export default function Partners() {
  return (
    <PageLayout content={PAGE_CONTEXTS["partners"]!}>
      <PartnersDirectory />
    </PageLayout>
  );
}
