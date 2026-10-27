import type { Metadata } from "next";
import { DeviceWorkspace } from "@/components/devices/DeviceWorkspace";
import { getServiceRepository } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Seadmed",
};

export default async function SeadmedPage(props: PageProps<"/seadmed">) {
  const repository = await getServiceRepository();
  const { q } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  return <DeviceWorkspace atms={await repository.searchAtms(query)} query={query} />;
}
