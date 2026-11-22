import { readSiteContent } from "@/lib/settings";
import ContentForm from "@/components/admin/ContentForm";

export const metadata = { title: "Контент сайта" };

export default async function ContentPage() {
  const content = await readSiteContent();
  return <ContentForm initial={content} />;
}
