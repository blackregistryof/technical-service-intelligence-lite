import type { Metadata } from "next";
import { FaultCallWorkspace } from "@/components/faultcalls/FaultCallWorkspace";
import { getServiceRepository } from "@/lib/dal";
import { countByStatus, filterByStatus, parseStatusFilter } from "@/lib/domain/filters";

export const metadata: Metadata = {
  title: "Rikketeated",
};

export default async function RikketeatedPage(props: PageProps<"/rikketeated">) {
  const repository = await getServiceRepository();
  const { q, staatus } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const status = parseStatusFilter(staatus);

  // Search and filtering happen on the server; the list stays newest first.
  const searchResult = await repository.listActiveFaultCalls(query);

  return (
    <FaultCallWorkspace
      items={filterByStatus(searchResult, status)}
      counts={countByStatus(searchResult)}
      query={query}
      status={status}
    />
  );
}
