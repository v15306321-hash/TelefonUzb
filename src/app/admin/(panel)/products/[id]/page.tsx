import { notFound } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";
import { loadFormOptions, loadProductForm } from "@/lib/admin/product-form";

export const metadata = { title: "Редактирование товара" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [initial, { brands, categories }] = await Promise.all([loadProductForm(id), loadFormOptions()]);
  if (!initial) notFound();
  return <ProductForm key={id} initial={initial} brands={brands} categories={categories} />;
}
