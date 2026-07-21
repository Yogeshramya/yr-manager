import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/jwt";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.businessId) {
      redirect("/dashboard");
    } else {
      cookieStore.delete("token");
      redirect("/login");
    }
  } else {
    redirect("/login");
  }
}
