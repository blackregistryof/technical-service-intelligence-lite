import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeviceWorkspace } from "@/components/devices/DeviceWorkspace";
import { getServiceRepository } from "@/lib/dal";
import { parseWorkTypeFilter } from "@/lib/domain/filters";

export const metadata: Metadata = {
  title: "Seadme ajalugu",
};

export default async function AtmHistoryPage(props: PageProps<"/seadmed/[atmNumber]">) {
  const repository = await getServiceRepository();
  const { atmNumber } = await props.params;
  const { q, liik } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  const history = await repository.getAtmHistory(atmNumber);
  if (!history) {
    notFound();
  }

  return (
    <DeviceWorkspace
      atms={await repository.searchAtms(query)}
      query={query}
      history={history}
      workType={parseWorkTypeFilter(liik)}
    />
  );
}
