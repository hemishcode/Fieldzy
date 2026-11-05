import { supabase } from "./supabase";

export async function testSupabase() {
  const { data, error } = await supabase
    .from("fields")
    .select("*");

  if (error) {
    console.error("Supabase connection failed:", error.message);
    return;
  }

  console.log("Supabase connected successfully!");
  console.log("Fields from database:", data);
}