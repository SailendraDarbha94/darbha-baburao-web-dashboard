import { redirect } from "next/navigation";

// The dashboard has no home page; proxy.ts has already sent signed-out visitors to /login.
export default function Home() {
  redirect("/claims");
}
