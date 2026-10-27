import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaultCallWorkspace } from "@/components/faultcalls/FaultCallWorkspace";
import { getServiceRepository } from "@/lib/dal";
import { buildFaultCallContext } from "@/lib/domain/context";
import { countByStatus, filterByStatus, parseStatusFilter } from "@/lib/domain/filters";

export const metadata: Metadata = {
  title: "Rikketeade",
};

export default async function FaultCallDetailPage(props: PageProps<"/rikketeated/[id]">) {
  const repository = await getServiceRepository();
  const { id } = await props.params;
  const { q, staatus } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const status = parseStatusFilter(staatus);

  const workOrder = await repository.getWorkOrder(id);
  if (!workOrder || workOrder.workType !== "FAULT_CALL") {
    notFound();
  }

  const [searchResult, history] = await Promise.all([
    repository.listActiveFaultCalls(query),
    repository.getAtmHistory(workOrder.atm.atmNumber),
  ]);

  return (
    <FaultCallWorkspace
      items={filterByStatus(searchResult, status)}
      counts={countByStatus(searchResult)}
      query={query}
      status={status}
      selected={workOrder}
      context={history ? buildFaultCallContext(history, workOrder.id) : null}
    />
  );
}
