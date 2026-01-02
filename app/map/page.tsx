import { createSupabaseClient } from "@/lib/supabaseClient";

export const revalidate = 0;

export default async function MapPage() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, created_at, species, condition, location_description, status, latitude, longitude"
    )
    .order("created_at", { ascending: false })
    .limit(25);

  return (
    <>
      <h1>Animals on the Map</h1>
      <p>
        Reports will appear here as pins so you can see where help is needed and
        decide how you might assist.
      </p>
      <p>
        Nearby shelters and veterinary clinics will be listed alongside each
        report to guide safe, informed action.
      </p>
      <section className="preview">
        <h2>Latest reports</h2>
        {error ? (
          <p className="error">Reports are unavailable right now.</p>
        ) : data && data.length > 0 ? (
          <ul>
            {data.map((report) => (
              <li key={report.id}>
                <strong>{report.species}</strong> · {report.condition} ·{" "}
                {report.location_description} · {report.status} ·{" "}
                {report.latitude === null || report.longitude === null
                  ? "Coordinates not provided"
                  : `${report.latitude}, ${report.longitude}`}{" "}
                · {new Date(report.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        ) : (
          <p>No reports yet. Check back soon.</p>
        )}
      </section>
    </>
  );
}
