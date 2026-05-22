"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
exports.getSupabaseClient = getSupabaseClient;
var supabase_js_1 = require("@supabase/supabase-js");
var supabaseClient = null;
function getSupabaseClient() {
    if (supabaseClient) {
        return supabaseClient;
    }
    var supabaseUrl = process.env.SUPABASE_URL;
    var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }
    supabaseClient = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    return supabaseClient;
}
exports.supabase = {
    get client() {
        return getSupabaseClient();
    },
    from: function (table) {
        return getSupabaseClient().from(table);
    }
};
