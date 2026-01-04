export default function StoriesPage() {
  const placeholders = [
    "Gentle Recovery",
    "Neighborhood Guardians",
    "Second Chance",
    "Safe Harbor",
    "Quiet Courage",
    "Kind Hands"
  ];

  return (
    <>
      <h1>Rescue Stories</h1>
      <p>
        This page will soon share stories of rescued animals and the people who
        helped them find safety and care.
      </p>
      <p className="stories-soon">Stories coming soon.</p>

      <h2>Upcoming stories</h2>
      <section className="stories-grid" aria-label="Story placeholders">
        {placeholders.map((title) => (
          <article className="story-card" key={title}>
            <div className="story-card-image" aria-hidden="true" />
            <h3 className="story-card-title">{title}</h3>
            <p className="story-card-text">Story placeholder</p>
          </article>
        ))}
      </section>
    </>
  );
}
