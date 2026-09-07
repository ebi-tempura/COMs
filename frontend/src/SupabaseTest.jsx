import { supabase } from "./lib/supabaseClient";

function SupabaseTest() {
  const testConnection = async () => {
    const { data, error } = await supabase.auth.getSession();

    console.log("SESSION:", data);
    console.log("ERROR:", error);
  };

  return (
    <button onClick={testConnection}>
      Test Supabase
    </button>
  );
}

export default SupabaseTest;