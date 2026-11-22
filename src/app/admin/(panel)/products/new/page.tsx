import ProductForm from "@/components/admin/ProductForm";
import { emptyProductForm, loadFormOptions } from "@/lib/admin/product-form";

export const metadata = { title: "Новый товар" };

export default async function NewProductPage() {
  const { brands, categories } = await loadFormOptions();
  return <ProductForm initial={emptyProductForm("", categories[0]?.id ?? "")} brands={brands} categories={categories} />;
}
