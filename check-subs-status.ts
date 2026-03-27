import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function main() {
  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("\n=== All recent subscriptions ===");
  subs?.forEach((sub) => {
    console.log(`\nUser: ${sub.user_id}`);
    console.log(`  Service: ${sub.service_name}`);
    console.log(`  Status: ${sub.status}`);
    console.log(`  Monthly Cost: $${sub.monthly_cost}`);
  });

  // Group by status
  const byStatus: Record<string, any[]> = {};
  subs?.forEach((sub) => {
    if (!byStatus[sub.status]) byStatus[sub.status] = [];
    byStatus[sub.status].push(sub);
  });

  console.log("\n=== By Status ===");
  Object.entries(byStatus).forEach(([status, items]) => {
    console.log(`${status}: ${items.length} subscriptions`);
    items.forEach((sub) =>
      console.log(`  - ${sub.user_id.substring(0, 8)}: ${sub.service_name}`)
    );
  });

  // Check family group
  const { data: groups, error: groupError } = await supabase
    .from("family_groups")
    .select("*");

  if (!groupError && groups) {
    console.log(`\n=== Family Groups ===`);
    groups.forEach((g) => {
      console.log(
        `Group: ${g.id.substring(0, 8)}, Owner: ${g.owner_id.substring(0, 8)}`
      );
    });

    for (const group of groups) {
      const { data: members } = await supabase
        .from("family_group_members")
        .select("*")
        .eq("family_group_id", group.id);

      console.log(`  Members: ${members?.map((m) => m.user_id.substring(0, 8)).join(", ")}`);

      if (members && members.length > 0) {
        const memberIds = [group.owner_id, ...members.map((m) => m.user_id)];
        const { data: memberSubs } = await supabase
          .from("subscriptions")
          .select("*")
          .in("user_id", memberIds);

        console.log(`  Family subscriptions:`);
        memberSubs?.forEach((sub) => {
          console.log(
            `    ${sub.user_id.substring(0, 8)}: ${sub.service_name} (${sub.status})`
          );
        });
      }
    }
  }
}

main().catch(console.error);
