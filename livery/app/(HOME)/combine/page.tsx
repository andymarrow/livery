import { permanentRedirect } from "next/navigation";

// /combine became /create; old links keep working.
export default async function CombineRedirect({ searchParams }: PageProps<"/combine">) {
  const { kind } = await searchParams;
  permanentRedirect(kind === "taste" ? "/create?kind=taste" : "/create?kind=site");
}
