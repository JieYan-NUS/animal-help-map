import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-media">
          <Image
            src="/hero.png"
            alt="A gentle close-up of an animal resting safely"
            fill
            priority
            sizes="100vw"
            className="hero-image"
          />
          <div className="hero-overlay" />
        </div>
        <div className="hero-content">
          <h1>
            See an animal in need. Help arrives faster when neighbors can find
            it.
          </h1>
          <p className="hero-subtitle">
            Share a quick report or check the map to see if someone nearby is
            already responding with care.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/report">
              Report an animal
            </Link>
            <Link className="button button-secondary" href="/map">
              Check the map
            </Link>
          </div>
        </div>
      </section>
      <h2>Animal Help Map</h2>
      <p>
        A gentle place to connect people and animals in need. Share a report or
        look for nearby help with care and respect.
      </p>
      <p className="disclaimer">
        This site is not an emergency service. If an animal is in immediate
        danger, please contact local authorities or emergency veterinary
        services.
      </p>
      <p className="disclaimer">
        Designed and built by Yifan Yan, with family collaboration, for the
        care and protection of animals in need.
      </p>
      <footer
        style={{
          marginTop: "2rem",
          fontSize: "0.85rem",
          color: "#6b635b",
          textAlign: "center",
        }}
      >
        Open-source project licensed under{" "}
        <Link href="https://www.gnu.org/licenses/agpl-3.0.html">
          GNU AGPL-3.0
        </Link>
        . Built for community care and transparency.
      </footer>
    </>
  );
}
