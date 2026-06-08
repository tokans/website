import { PageLayout } from "../components/site.js";
import { PAGE_CONTEXTS } from "../data/pageContexts.js";
import AppsDirectory from "./AppsDirectory.js";

/**
 * Public directory of apps listed for Tokans support (/apps). The live page is
 * the static apps.html shell with AppsDirectory mounted as an island; this React
 * screen wraps the same widget in PageLayout for any SPA fallback.
 */
export default function Apps() {
  return (
    <PageLayout content={PAGE_CONTEXTS["apps"]!}>
      <AppsDirectory />
    </PageLayout>
  );
}
