import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function main() {
  console.log("\n=== Family Groups ===");
  const { data: groups } = await supabase.from("family_groups").select("*");

  groups?.forEach((g) => {
    console.log(
      `\nGroup ${g.id.substring(0, 12)} (owner: ${g.owner_id.substring(0, 12)})`
    );
  });

  console.log("\n=== Family Group Members ===");
  const { data: members } = await supabase
    .from("family_group_members")
    .select("*");

  members?.forEach((m) => {
    console.log(
      `  Group ${m.family_group_id.substring(0, 12)} <- User ${m.user_id.substring(0, 12)} (${m.role})`
    );
  });

  console.log("\n=== Which user has the spotify subscription? ===");
  const { data: spotify } = await supabase
    .from("subscriptions")
    .select("user_id, name, status")
    .eq("name", "spotify");

  spotify?.forEach((s) => {
    console.log(
      `Spotify (${s.status}): owned by ${s.user_id.substring(0, 12)}`
    );
  });

  console.log("\n=== Can the owner of family group see spotify? ===");
  const { data: ownerGroups } = await supabase
    .from("family_groups")
    .select("*")
    .eq("owner_id", "00000000-0000-0000-0000-000000000001");

  console.log(`Owner has ${ownerGroups?.length || 0} groups`);

  if (ownerGroups && ownerGroups.length > 0) {
    for (const group of ownerGroups) {
      console.log(`\n  Group: ${group.id.substring(0, 12)}`);
      const { data: groupMembers } = await supabase
        .from("family_group_members")
        .select("user_id")
        .eq("family_group_id", group.id);

      const memberIds = (groupMembers || []).map((m) => m.user_id);
      memberIds.push(group.owner_id); // include owner
      console.log(
        `  Members: ${memberIds.map((m) => m.substring(0, 12)).join(", ")}`
      );

      const { data: subs } = await supabase
        .from("subscriptions")
        .select("name, status, user_id, amount")
        .in("user_id", memberIds);

      console.log(`  Subscriptions:`);
      subs?.forEach((s) => {
        console.log(
          `    - ${s.name} (${s.status}, $${s.amount}) from ${s.user_id.substring(0, 12)}`
        );
      });
    }
  }
}

main().catch(console.error);
