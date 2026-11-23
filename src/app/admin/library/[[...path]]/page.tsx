import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ path?: string[] }>;
}

export default async function CategoryContentPage({ params }: PageProps) {
  const { path } = await params;
  if (!path?.length) {
    redirect("/content");
  }
  redirect(`/content/${path.join("/")}`);
}
