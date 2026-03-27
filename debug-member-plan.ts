import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function check() {
  // Get donckerwolcke.alexi@gmail.com user
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error("Error fetching users:", usersError);
    return;
  }

  const memberUser = users?.users.find(u => u.email === "donckerwolcke.alexi@gmail.com");
  
  if (!memberUser) {
    console.log("User donckerwolcke.alexi@gmail.com not found");
    return;
  }

  console.log("Member User ID:", memberUser.id);

  // Check family group memberships
  const { data: memberships } = await supabase
    .from("family_group_members")
    .select("*")
    .eq("user_id", memberUser.id);

  console.log("\nFamily memberships:", memberships);

  // Check subscription
  const { data: subs } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", memberUser.id);

  console.log("\nSubscriptions:", subs);
  if (subs && subs.length > 0) {
    console.log("Plan type:", subs[0].plan_type);
    console.log("Status:", subs[0].status);
  }

  // Check plan backups
  const { data: backups } = await supabase
    .from("family_group_plan_backups")
    .select("*")
    .eq("user_id", memberUser.id);

  console.log("\nPlan backups:", backups);
}

check().catch(console.error);
