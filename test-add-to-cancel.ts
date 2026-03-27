import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function main() {
  // Get the test family group member
  const { data: groups } = await supabase
    .from("family_groups")
    .select("*")
    .eq("owner_id", "00000000-0000-0000-0000-000000000001");

  if (!groups || groups.length === 0) {
    console.log("No family group found for test owner");
    return;
  }

  const groupId = groups[0].id;
  const { data: members } = await supabase
    .from("family_group_members")
    .select("user_id")
    .eq("family_group_id", groupId);

  if (!members || members.length === 0) {
    console.log("No members in family group");
    return;
  }

  const memberId = members[0].user_id;
  console.log(
    `Testing with family group member: ${memberId.substring(0, 12)}`
  );

  // Create a to-cancel subscription for this member
  const { data: newSub, error } = await supabase
    .from("subscriptions")
    .insert({
      id: randomUUID(),
      user_id: memberId,
      name: "Test Unused Service",
      category: "Utilities",
      amount: 15,
      currency: "USD",
      frequency: "monthly",
      next_billing_at: new Date().toISOString(),
      status: "to-cancel"
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating subscription:", error);
    return;
  }

  console.log(`✓ Created to-cancel subscription: ${newSub.name}`);
  console.log("\nNow test calling the API with family=true");
  console.log(`Family group ID: ${groupId.substring(0, 12)}`);
}

main().catch(console.error);
